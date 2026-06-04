type EmailPreviewProps = {
  html: string;
};

export function EmailPreview({ html }: EmailPreviewProps) {
  return (
    <div className="email-preview">
      <iframe title="Email preview" srcDoc={html} sandbox="" />
    </div>
  );
}
