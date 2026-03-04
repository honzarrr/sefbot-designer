'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  FolderUp,
  Download,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/AppHeader';

interface BatchResult {
  fileName: string;
  projectId: string | null;
  status: 'success' | 'failed';
  stepCount: number;
  connectionCount: number;
  error?: string;
}

interface BatchResponse {
  total: number;
  imported: number;
  failed: number;
  results: BatchResult[];
}

type ImportPhase = 'select' | 'confirm' | 'importing' | 'done';

export default function BatchImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<ImportPhase>('select');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [batchResponse, setBatchResponse] = useState<BatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback((files: File[]) => {
    const vfFiles = files.filter(f => f.name.endsWith('.vf'));
    if (vfFiles.length === 0) {
      setError('No .vf files found in selection');
      return;
    }
    setError(null);
    setSelectedFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const newFiles = vfFiles.filter(f => !existing.has(f.name));
      return [...prev, ...newFiles];
    });
    setPhase('confirm');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) addFiles(files);
  }, [addFiles]);

  const removeFile = useCallback((name: string) => {
    setSelectedFiles(prev => {
      const next = prev.filter(f => f.name !== name);
      if (next.length === 0) setPhase('select');
      return next;
    });
  }, []);

  const startImport = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setPhase('importing');
    setError(null);
    setBatchResponse(null);

    const formData = new FormData();
    selectedFiles.forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/import/batch', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Batch import failed');
        setPhase('confirm');
        return;
      }

      setBatchResponse(data);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setPhase('confirm');
    }
  }, [selectedFiles]);

  const downloadErrorLog = useCallback(() => {
    if (!batchResponse) return;

    const failedResults = batchResponse.results.filter(r => r.status === 'failed');
    if (failedResults.length === 0) return;

    const csvContent = [
      'File Name,Error',
      ...failedResults.map(r =>
        `"${r.fileName.replace(/"/g, '""')}","${(r.error || 'Unknown error').replace(/"/g, '""')}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [batchResponse]);

  const reset = useCallback(() => {
    setPhase('select');
    setSelectedFiles([]);
    setBatchResponse(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Upload hundreds of .vf files at once to migrate your entire Voiceflow workspace.
            Files are processed sequentially for stability.
          </p>
        </div>

        {/* Phase: Select Files */}
        {(phase === 'select' || phase === 'confirm') && (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <FolderUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-medium mb-2">
                Drop .vf files here
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                or click to select files
              </p>
              <p className="text-xs text-muted-foreground">
                Supports bulk selection of 400+ files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".vf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {error && (
              <div className="mt-4 border border-destructive/50 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Phase: Confirm - show selected files */}
        {phase === 'confirm' && selectedFiles.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {selectedFiles.length} files selected
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Add More Files
                </Button>
                <Button onClick={startImport}>
                  Start Import
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2">
                {selectedFiles.map((file) => (
                  <div key={file.name} className="flex items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(file.name)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Phase: Importing */}
        {phase === 'importing' && (
          <div className="mt-6 border rounded-lg p-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            <p className="text-xl font-medium mb-2">Importing {selectedFiles.length} files...</p>
            <p className="text-sm text-muted-foreground">
              This may take a while for large batches. Please do not close this page.
            </p>
            <div className="w-full max-w-md mx-auto mt-6 bg-muted rounded-full h-2">
              <div className="bg-primary rounded-full h-2 animate-pulse" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {/* Phase: Done - results */}
        {phase === 'done' && batchResponse && (
          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Import Complete</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-3xl font-bold">{batchResponse.total}</p>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{batchResponse.imported}</p>
                  <p className="text-sm text-muted-foreground">Imported</p>
                </div>
                <div className="text-center p-4 bg-destructive/10 rounded-lg">
                  <p className="text-3xl font-bold text-destructive">{batchResponse.failed}</p>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => router.push('/')}>
                Go to Projects
              </Button>
              <Button variant="outline" onClick={reset}>
                Import More
              </Button>
              {batchResponse.failed > 0 && (
                <Button variant="outline" onClick={downloadErrorLog}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Error Log
                </Button>
              )}
            </div>

            {/* Results table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">Results</span>
                <span className="text-xs text-muted-foreground">
                  {batchResponse.results.length} files
                </span>
              </div>
              <ScrollArea className="h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium w-8">#</th>
                      <th className="text-left p-3 font-medium">File Name</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Steps</th>
                      <th className="text-left p-3 font-medium">Connections</th>
                      <th className="text-left p-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResponse.results.map((result, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[250px]">{result.fileName}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {result.status === 'success' ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 text-xs font-medium">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <XCircle className="h-4 w-4 text-destructive" />
                              <span className="text-destructive text-xs font-medium">Failed</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{result.stepCount}</td>
                        <td className="p-3 text-muted-foreground">{result.connectionCount}</td>
                        <td className="p-3">
                          {result.status === 'success' && result.projectId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => router.push(`/project?id=${result.projectId}`)}
                            >
                              Open
                            </Button>
                          ) : (
                            <span className="text-xs text-destructive truncate max-w-[150px] block">
                              {result.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
