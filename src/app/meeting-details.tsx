import { Fragment } from "react";

const urlPattern = /(https?:\/\/[^\s<>"']+)/g;

function safeHref(candidate: string) {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Shows meeting details as text, turning http(s) links into clickable links. */
export function MeetingDetailsText({ text }: { text: string }) {
  return (
    <span className="meeting-details-text">
      {text.split(urlPattern).map((part, index) => {
        const href = index % 2 === 1 ? safeHref(part) : null;
        return href ? (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer">{part}</a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        );
      })}
    </span>
  );
}
