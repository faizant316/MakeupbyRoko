import dynamic from 'next/dynamic';
const PageNotFound = dynamic(() => import('../src/lib/PageNotFound'), { ssr: false });
export default PageNotFound;
