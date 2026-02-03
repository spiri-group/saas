import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ComponentProps } from "react";

type VisuallyHiddenProps = ComponentProps<typeof VisuallyHidden.Root>;

const VisuallyHiddenComponent: React.FC<VisuallyHiddenProps> = ({ children, ...rest }) => (
  <VisuallyHidden.Root {...rest}>{children}</VisuallyHidden.Root>
);

export default VisuallyHiddenComponent;