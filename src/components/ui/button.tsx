import { Button as ChakraButton, type ButtonProps as ChakraButtonProps } from "@chakra-ui/react"
import { forwardRef } from "react"

export interface ButtonProps extends ChakraButtonProps { }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    function Button(props, ref) {
        return <ChakraButton ref={ref} {...props} />
    },
)
