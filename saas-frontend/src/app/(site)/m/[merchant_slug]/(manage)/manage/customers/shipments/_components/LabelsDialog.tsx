'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogProps } from "@radix-ui/react-dialog";
import { useShipmentsContext } from "../provider";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import PDFPrintButton from "@/app/(site)/components/0_PDFS/_components/PDFPrintButton";
import PDFSaveButton from "@/app/(site)/components/0_PDFS/_components/PDFSaveButton";
import PDFSendButton from "@/app/(site)/components/0_PDFS/_components/PDFSendButton";

type Props = DialogProps & {
  onOpenChange: (open: boolean) => void;
};

const LabelsDialog: React.FC<Props> = ({ onOpenChange, ...dialogProps }) => {
  const router = useRouter();
  const { dispatch, selectedShipment } = useShipmentsContext();

  if (!selectedShipment || !selectedShipment.packedBoxes?.length) return null;

  const shipmentId = selectedShipment.id;

  const pdfUrl = (url: string): string => {
    return `/api/proxy-label?url=${encodeURIComponent(url)}`;
  };

  return (
    <Dialog {...dialogProps}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shipping Labels Ready</DialogTitle>
        </DialogHeader>

        <div className="text-sm space-y-4">
          <p>Download and manage the label(s) for this shipment:</p>

          {selectedShipment.packedBoxes?.length > 0 ? (
            <ul className="space-y-4">
              {selectedShipment.packedBoxes.map((box) => (
                <li key={box.id} className="border p-3 rounded shadow-sm">
                  <div className="font-medium mb-1">Box: {box.code}</div>

                  <div className="text-xs text-muted-foreground mb-2">
                    {box.items.map((item) => (
                      <div key={item.id}>
                        {item.name} (x{item.quantity})
                      </div>
                    ))}
                  </div>

                  {box.label?.label_download?.pdf ? (
                    <div className="grid grid-cols-3 gap-2">
                      <PDFPrintButton
                        variant="secondary"
                        pdfUrl={pdfUrl(box.label.label_download.pdf)}
                      />
                      <PDFSaveButton
                        variant="secondary"
                        pdfUrl={pdfUrl(box.label.label_download.pdf)}
                        defaultFileName={`box-${box.code}.pdf`}
                        label="Save"
                      />
                      <PDFSendButton
                        variant="secondary"
                        pdfUrl={pdfUrl(box.label.label_download.pdf)}
                        subject={`Shipping Label - ${selectedShipment.code}`}
                        defaultFileName={`box-${box.code}.pdf`}
                        cc={[]}
                        contacts={[]}
                        onSuccess={(c) => console.log("Sent to:", c)}
                      />
                    </div>
                  ) : (
                    <p className="text-red-600 text-sm">Label not available for this box.</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground italic">No packed boxes found.</p>
          )}
        </div>

        <DialogFooter className="mt-6 flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              dispatch({ type: "REMOVE_SHIPMENT", payload: { shipmentId } });
            }}
          >
            Continue Packing Shipments
          </Button>
          <Button onClick={() => router.push("../deliveries")}>
            Go to Deliveries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelsDialog;
