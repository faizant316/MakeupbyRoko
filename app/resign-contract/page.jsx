import dynamic from 'next/dynamic';
const ResignContract = dynamic(() => import('../../src/views/ResignContract'), { ssr: false });
export default ResignContract;
