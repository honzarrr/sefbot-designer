'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  FolderUp,
} from 'lucide-react';
import { AppHeader } from '@/components/shared/AppHeader';

interface ImportResult {
  projectId: string;
  projectName: string;
  stats: {
    steps: number;
    connections: number;
    notes?: number;
    rows?: number;
  };
}

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

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Single import state
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Batch import state
  const [batchDragOver, setBatchDragOver] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [batchResponse, setBatchResponse] = useState<BatchResponse | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  // Single file import
  const handleSingleImport = useCallback(async (file: File) => {
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    setSelectedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = file.name.endsWith('.csv') ? '/api/import/csv' : '/api/import/vf';

    try {
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || 'Import failed');
        return;
      }

      setImportResult(data);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setImporting(false);
    }
  }, []);

  // Drag and drop handlers for single file
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

    const files = Array.from(e.dataTransfer.files);
    const valid = files.find(f => f.name.endsWith('.vf') || f.name.endsWith('.csv'));
    if (valid) {
      handleSingleImport(valid);
    } else {
      setImportError('Please drop a .vf or .csv file');
    }
  }, [handleSingleImport]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSingleImport(file);
  }, [handleSingleImport]);

  // Batch import
  const handleBatchImport = useCallback(async (files: File[]) => {
    const vfFiles = files.filter(f => f.name.endsWith('.vf'));
    if (vfFiles.length === 0) {
      setBatchError('No .vf files found');
      return;
    }

    setBatchImporting(true);
    setBatchError(null);
    setBatchResponse(null);
    setBatchFiles(vfFiles);
    setBatchProgress({ current: 0, total: vfFiles.length });

    const formData = new FormData();
    vfFiles.forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/import/batch', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setBatchError(data.error || 'Batch import failed');
        return;
      }

      setBatchResponse(data);
      setBatchProgress({ current: data.total, total: data.total });
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBatchImporting(false);
    }
  }, []);

  const handleBatchDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(true);
  }, []);

  const handleBatchDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(false);
  }, []);

  const handleBatchDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBatchDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleBatchImport(files);
  }, [handleBatchImport]);

  const handleBatchFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) handleBatchImport(files);
  }, [handleBatchImport]);

  const resetSingle = useCallback(() => {
    setImportResult(null);
    setImportError(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const resetBatch = useCallback(() => {
    setBatchResponse(null);
    setBatchError(null);
    setBatchFiles([]);
    setBatchProgress(null);
    if (batchInputRef.current) batchInputRef.current.value = '';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single File Import</TabsTrigger>
            <TabsTrigger value="batch">Batch Import</TabsTrigger>
          </TabsList>

          {/* Single File Import Tab */}
          <TabsContent value="single" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Import a Voiceflow or CSV file</h2>
                <p className="text-sm text-muted-foreground">
                  Upload a .vf file (Voiceflow export) or .csv file to create a new project.
                </p>
              </div>

              {/* Drop Zone */}
              {!importResult && !importing && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-1">
                    Drop a file here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports .vf (Voiceflow) and .csv files
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vf,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Importing state */}
              {importing && (
                <div className="border rounded-lg p-12 text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-lg font-medium mb-1">Importing...</p>
                  <p className="text-sm text-muted-foreground">
                    Processing {selectedFile?.name}
                  </p>
                </div>
              )}

              {/* Error */}
              {importError && (
                <div className="border border-destructive/50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">Import Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{importError}</p>
                      {selectedFile && (
                        <p className="text-xs text-muted-foreground mt-1">File: {selectedFile.name}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={resetSingle}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Success */}
              {importResult && (
                <div className="border border-green-500/50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">Import Successful</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Project &quot;{importResult.projectName}&quot; has been created.
                      </p>
                      <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                        <span>{importResult.stats.steps} steps</span>
                        {importResult.stats.connections !== undefined && (
                          <span>{importResult.stats.connections} connections</span>
                        )}
                        {importResult.stats.notes !== undefined && (
                          <span>{importResult.stats.notes} notes</span>
                        )}
                        {importResult.stats.rows !== undefined && (
                          <span>{importResult.stats.rows} rows parsed</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => router.push(`/project?id=${importResult.projectId}`)}>
                      Open Project
                    </Button>
                    <Button variant="outline" onClick={resetSingle}>
                      Import Another
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Batch Import Tab */}
          <TabsContent value="batch" className="mt-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-1">Batch Import</h2>
                <p className="text-sm text-muted-foreground">
                  Upload multiple .vf files at once. For large migrations (400+ files), use the{' '}
                  <button
                    onClick={() => router.push('/import/batch')}
                    className="text-primary underline hover:text-primary/80"
                  >
                    dedicated batch import page
                  </button>.
                </p>
              </div>

              {/* Drop Zone */}
              {!batchResponse && !batchImporting && (
                <div
                  onDragOver={handleBatchDragOver}
                  onDragLeave={handleBatchDragLeave}
                  onDrop={handleBatchDrop}
                  onClick={() => batchInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    batchDragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <FolderUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-1">
                    Drop multiple .vf files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    All .vf files will be imported as separate projects
                  </p>
                  <input
                    ref={batchInputRef}
                    type="file"
                    accept=".vf"
                    multiple
                    onChange={handleBatchFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Batch importing progress */}
              {batchImporting && batchProgress && (
                <div className="border rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <p className="font-medium">
                      Importing {batchFiles.length} files...
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Processing... Please wait.
                  </p>
                </div>
              )}

              {/* Batch error */}
              {batchError && (
                <div className="border border-destructive/50 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-destructive">Batch Import Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{batchError}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={resetBatch}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Batch results */}
              {batchResponse && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">{batchResponse.imported} imported</span>
                      </div>
                      {batchResponse.failed > 0 && (
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-destructive" />
                          <span className="font-medium">{batchResponse.failed} failed</span>
                        </div>
                      )}
                      <span className="text-sm text-muted-foreground">
                        of {batchResponse.total} total
                      </span>
                    </div>
                  </div>

                  {/* Results table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium">File</th>
                          <th className="text-left p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Steps</th>
                          <th className="text-left p-3 font-medium">Connections</th>
                          <th className="text-left p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResponse.results.map((result, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px]">{result.fileName}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              {result.status === 'success' ? (
                                <Badge variant="default" className="bg-green-500">Success</Badge>
                              ) : (
                                <Badge variant="destructive">Failed</Badge>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">{result.stepCount}</td>
                            <td className="p-3 text-muted-foreground">{result.connectionCount}</td>
                            <td className="p-3">
                              {result.status === 'success' && result.projectId ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/project?id=${result.projectId}`)}
                                >
                                  Open
                                </Button>
                              ) : (
                                <span className="text-xs text-destructive">{result.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button variant="outline" onClick={resetBatch}>
                    Import More
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
