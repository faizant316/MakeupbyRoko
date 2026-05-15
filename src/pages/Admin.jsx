// This file is a stub — the actual Admin component lives in src/views/Admin.jsx
// Next.js App Router uses /admin via app/admin/page.jsx
export default function AdminStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/admin', permanent: false } };
}
