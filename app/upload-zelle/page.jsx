import dynamic from 'next/dynamic';
const UploadZelle = dynamic(() => import('../../src/views/UploadZelle'), { ssr: false });
export default UploadZelle;
