/** Clapperboard-style act label: striped clapper, then act / scene / take. */
export function Slate({
  act,
  title,
  scene,
  id,
  className = "",
}: {
  act: string;
  title: string;
  scene: string;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`inline-flex flex-col gap-2 ${className}`}>
      <span className="slate-stripes" aria-hidden="true" />
      <p className="mono-label text-muted flex flex-wrap gap-x-3 gap-y-1">
        <span className="text-amber">{act}</span>
        <span aria-hidden="true">·</span>
        <span>Sc. {scene}</span>
        <span aria-hidden="true">·</span>
        <span>Take 1</span>
      </p>
      <p id={id} className="mono-label text-paper">
        {title}
      </p>
    </div>
  );
}
