// Stub — redirects to App Router home
export default function HomeStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/', permanent: false } };
}
