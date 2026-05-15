import dynamic from 'next/dynamic';
const AdminInvite = dynamic(() => import('../../src/views/AdminInvite'), { ssr: false });
export default AdminInvite;
