import ClassCheckoutFlow from './ClassCheckoutFlow';

// MakeupClassModal now delegates entirely to ClassCheckoutFlow
export default function MakeupClassModal({ onClose }) {
  return <ClassCheckoutFlow onClose={onClose} />;
}