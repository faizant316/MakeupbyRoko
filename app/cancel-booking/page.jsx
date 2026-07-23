import dynamic from 'next/dynamic';
const CancelBooking = dynamic(() => import('../../src/views/CancelBooking'), { ssr: false });
export default CancelBooking;
