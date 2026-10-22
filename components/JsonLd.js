// Structured data (schema.org JSON-LD) that search engines read for rich results.
// "<" is escaped so a title like "</script>" can never break out of the tag.
export default function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
