// Stub — actual component in src/views/TermsOfService.jsx
export default function TermsOfServiceStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/terms-of-service', permanent: false } };
}
