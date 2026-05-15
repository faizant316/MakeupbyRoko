import dynamic from 'next/dynamic';
const PrivacyPolicy = dynamic(() => import('../../src/views/PrivacyPolicy'), { ssr: false });
export default PrivacyPolicy;
