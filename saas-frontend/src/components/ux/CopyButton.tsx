import React, { useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Button, ButtonProps } from '../ui/button';

type CopyButtonProps = ButtonProps & {
    textToCopy: string
}

const CopyButton: React.FC<CopyButtonProps> = (props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <CopyToClipboard text={props.textToCopy}>
      <Button {...props} type="button" onClick={handleCopy}>
        {copied ? 'Copied!' : props.children}
      </Button>
    </CopyToClipboard>
  );
};

export default CopyButton;
