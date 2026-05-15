// Stub — actual component in src/views/AdminInvite.jsx
export default function AdminInviteStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/admin-invite', permanent: false } };
}
