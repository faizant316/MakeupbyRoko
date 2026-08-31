// Stub — actual component in src/views/UploadZelle.jsx
export default function UploadZelleStub() { return null; }
export async function getServerSideProps(ctx) {
  const { id, token } = ctx.query;
  // Only forward the params that are actually present. Interpolating a missing
  // token gave the new page the literal string "undefined" to look up.
  const qs = new URLSearchParams();
  if (id) qs.set('id', id);
  if (token) qs.set('token', token);
  const dest = `/upload-zelle${qs.size ? `?${qs}` : ''}`;
  return { redirect: { destination: dest, permanent: false } };
}
