import Link from "next/link";

export function Crumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  return (
    <p className="crumbs">
      {items.map((item, index) => (
        <span key={`${item.name}-${index}`}>
          {index > 0 ? " / " : null}
          {item.href ? <Link href={item.href}>{item.name}</Link> : item.name}
        </span>
      ))}
    </p>
  );
}
