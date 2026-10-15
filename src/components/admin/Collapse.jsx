import { Fold } from './ui';

// Opens and shuts a section. It used to measure the content's pixel height and
// animate that, with a GPU-layer hint to stop the rows' shadows repainting on
// every frame. The rows carry no shadows now, so the grid-row fold does the
// same job with nothing to measure (see .fold in admin.css).
export default function Collapse({ open, children }) {
  return <Fold open={open}>{children}</Fold>;
}
