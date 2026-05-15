export default function ZelleSuccessUpload() {
  return (
    <div className="flex items-start gap-3 px-4 py-4 bg-[#FDF9F7] border border-[#f0ebe6] rounded-xl">
      <span className="text-base flex-shrink-0 mt-0.5">📧</span>
      <p className="text-[0.75rem] text-[#A0785A] leading-[1.7]">
        <strong className="text-[#7a5c3f]">Zelle upload instructions have been sent to your email</strong> — use the personal link in your confirmation email to submit your screenshot anytime.
      </p>
    </div>
  );
}