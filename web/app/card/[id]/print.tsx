"use client";
export function PrintButton() {
  return <button className="ink" onClick={() => window.print()}>Print the card</button>;
}
