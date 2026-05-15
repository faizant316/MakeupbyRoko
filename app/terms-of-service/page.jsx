import dynamic from 'next/dynamic';
const TermsOfService = dynamic(() => import('../../src/views/TermsOfService'), { ssr: false });
export default TermsOfService;
