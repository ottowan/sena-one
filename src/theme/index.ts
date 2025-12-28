import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
    theme: {
        tokens: {
            colors: {
                brand: {
                    50: { value: "#E6F6FF" },
                    100: { value: "#BAE3FF" },
                    200: { value: "#7CC4FA" },
                    300: { value: "#47A3F3" },
                    400: { value: "#2186EB" },
                    500: { value: "#0967D2" },
                    600: { value: "#0552B5" },
                    700: { value: "#03449E" },
                    800: { value: "#01337D" },
                    900: { value: "#002159" },
                },
                success: {
                    50: { value: "#E3F9E5" },
                    100: { value: "#C1F2C7" },
                    200: { value: "#91E697" },
                    300: { value: "#51CA58" },
                    400: { value: "#31B237" },
                    500: { value: "#18981D" },
                    600: { value: "#0F8613" },
                    700: { value: "#0E7817" },
                    800: { value: "#07600E" },
                    900: { value: "#014807" },
                },
                warning: {
                    50: { value: "#FFFBEA" },
                    100: { value: "#FFF3C4" },
                    200: { value: "#FCE588" },
                    300: { value: "#FADB5F" },
                    400: { value: "#F7C948" },
                    500: { value: "#F0B429" },
                    600: { value: "#DE911D" },
                    700: { value: "#CB6E17" },
                    800: { value: "#B44D12" },
                    900: { value: "#8D2B0B" },
                },
                danger: {
                    50: { value: "#FFE3E3" },
                    100: { value: "#FFBDBD" },
                    200: { value: "#FF9B9B" },
                    300: { value: "#F86A6A" },
                    400: { value: "#EF4E4E" },
                    500: { value: "#E12D39" },
                    600: { value: "#CF1124" },
                    700: { value: "#AB091E" },
                    800: { value: "#8A041A" },
                    900: { value: "#610316" },
                },
            },
            fonts: {
                heading: { value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
                body: { value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
            },
            radii: {
                sm: { value: "0.375rem" },
                md: { value: "0.5rem" },
                lg: { value: "0.75rem" },
                xl: { value: "1rem" },
                "2xl": { value: "1.5rem" },
                full: { value: "9999px" },
            },
            shadows: {
                sm: { value: "0 1px 2px 0 rgba(0, 0, 0, 0.05)" },
                md: { value: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" },
                lg: { value: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" },
                xl: { value: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" },
                "2xl": { value: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" },
                glass: { value: "0 8px 32px 0 rgba(31, 38, 135, 0.15)" },
            },
        },
        semanticTokens: {
            colors: {
                primary: {
                    solid: { value: "{colors.brand.500}" },
                    contrast: { value: "white" },
                },
                secondary: {
                    solid: { value: "{colors.gray.600}" },
                    contrast: { value: "white" },
                },
            },
        },
    },
})

export const system = createSystem(defaultConfig, customConfig)
