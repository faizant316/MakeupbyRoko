// Stub — actual component in src/views/UploadZelle.jsx
export default function UploadZelleStub() { return null; }
export async function getServerSideProps(ctx) {
  const { id, token } = ctx.query;
  const dest = `/upload-zelle${id ? `?id=${id}&token=${token}` : ''}`;
  return { redirect: { destination: dest, permanent: false } };
}
