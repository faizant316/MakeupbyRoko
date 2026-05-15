// Stub — actual component in src/views/PrivacyPolicy.jsx
export default function PrivacyPolicyStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/privacy-policy', permanent: false } };
}
