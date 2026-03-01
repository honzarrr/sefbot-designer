import ProjectPageClient from './ProjectPageClient';

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectPageClient id={params.id} />;
}
