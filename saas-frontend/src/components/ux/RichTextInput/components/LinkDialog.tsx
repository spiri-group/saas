import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { $toggleLink } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection } from "lexical";
import { useEffect, useRef, useState } from "react";
import CancelDialogButton from "../../CancelDialogButton";
import { Link2Icon } from "lucide-react";
import { isNullOrWhitespace } from "@/lib/functions";


const LinkDialog: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [editor] = useLexicalComposerContext();
  const [url, setUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const editorRef = useRef(editor);

  const handleClose = () => {
    setUrl("");
    setIsVisible(false);
  }
  
  useEffect(() => {
    editorRef.current.read(() => {
      if (!isVisible) return;
      // we check if the parent of the selection is a link node
      
      const selection = $getSelection();
      const nodes = selection?.getNodes();
      if ((nodes == undefined) || (nodes.length === 0 || nodes.length > 1)) {
        setIsVisible(false);
        return;
      }
      const selected_node = nodes[0];

      // const parentNode = selected_node.getParent();
      // if ($isLinkNode(parentNode)) {
      //   setUrl(parentNode.__url);
      //   setErrorMessage("");
      // } else {
        if (!isNullOrWhitespace(selected_node.getTextContent())) {
          setUrl("");
          setErrorMessage("");
        } else {
          setErrorMessage("You must select a text to create a link");
        }
      // }
    })
  }, [isVisible]);  

  return (
    <Dialog open={isVisible}>
      <DialogTrigger asChild>
        <Button 
          variant={"ghost"}
          onClick={() => {
            setIsVisible(true);
          }}>
          <Link2Icon size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        { errorMessage && <p className="text-slate-500">{errorMessage}</p> }
        { !errorMessage && <Input placeholder="Enter URL" value={url} onChange={(e) => setUrl(e.target.value)} /> }
        <DialogFooter className="flex flex-row space-x-3">
            <CancelDialogButton
              className={errorMessage == "" ? "" : "flex-grow"}
              onCancel={() => {
                setIsVisible(false);
              }} />
            { errorMessage == "" && 
                <Button
                className="flex-grow" 
                onClick={() => {
                editor.update(() => {
                  $toggleLink(url);
                });
                handleClose();
              }}>Apply</Button> }
        </DialogFooter>
      </DialogContent>
    </Dialog>

  );
};

export default LinkDialog;