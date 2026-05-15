import dynamic from 'next/dynamic';
const ServicesPage = dynamic(() => import('../src/views/Services'), { ssr: false });
export default ServicesPage;
