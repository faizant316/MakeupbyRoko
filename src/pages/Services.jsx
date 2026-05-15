// This file is a stub — the actual Services component lives in src/views/Services.jsx
export default function ServicesStub() { return null; }
export async function getServerSideProps() {
  return { redirect: { destination: '/', permanent: false } };
}
