import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const customConfig = defineConfig({
    theme: {
        tokens: {
            colors: {
                brand: {
                    50: { value: "#F0F7F6" },
                    100: { value: "#D9ECE9" },
                    200: { value: "#B8DCD6" },
                    300: { value: "#8FC7BD" },
                    400: { value: "#62AB9D" },
                    500: { value: "#3F8F83" },
                    600: { value: "#2F746B" },
                    700: { value: "#285F59" },
                    800: { value: "#234D49" },
                    900: { value: "#1F403D" },
                    950: { value: "#102624" },
                },
                accent: {
                    50: { value: "#FFF7ED" },
                    100: { value: "#FFEDD5" },
                    200: { value: "#FED7AA" },
                    300: { value: "#FDBA74" },
                    400: { value: "#FB923C" },
                    500: { value: "#F97316" },
                    600: { value: "#EA580C" },
                    700: { value: "#C2410C" },
                    800: { value: "#9A3412" },
                    900: { value: "#7C2D12" },
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
                bg: {
                    canvas: {
                        value: { base: "#F7FAF9", _dark: "#111827" }
                    },
                    panel: {
                        value: { base: "#FFFFFF", _dark: "#1B2624" }
                    },
                    subtle: {
                        value: { base: "#EEF5F3", _dark: "#182322" }
                    },
                    muted: {
                        value: { base: "#E2ECE9", _dark: "#263433" }
                    }
                },
                fg: {
                    default: {
                        value: { base: "#172321", _dark: "#F3F6F5" }
                    },
                    muted: {
                        value: { base: "#586866", _dark: "#AEBAB8" }
                    },
                    subtle: {
                        value: { base: "#71817E", _dark: "#84918F" }
                    }
                },
                border: {
                    default: {
                        value: { base: "#D7E2DF", _dark: "#334240" }
                    },
                    muted: {
                        value: { base: "#EAF1EF", _dark: "#263433" }
                    }
                },
                brand: {
                    subtle: {
                        value: { base: "{colors.brand.50}", _dark: "{colors.brand.900}" }
                    },
                    muted: {
                        value: { base: "{colors.brand.100}", _dark: "{colors.brand.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.brand.200}", _dark: "{colors.brand.700}" }
                    },
                    solid: {
                        value: { base: "{colors.brand.500}", _dark: "{colors.brand.400}" }
                    },
                    fg: {
                        value: { base: "{colors.brand.700}", _dark: "{colors.brand.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                },
                accent: {
                    subtle: {
                        value: { base: "{colors.accent.50}", _dark: "{colors.accent.900}" }
                    },
                    muted: {
                        value: { base: "{colors.accent.100}", _dark: "{colors.accent.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.accent.200}", _dark: "{colors.accent.700}" }
                    },
                    solid: {
                        value: { base: "{colors.accent.500}", _dark: "{colors.accent.400}" }
                    },
                    fg: {
                        value: { base: "{colors.accent.700}", _dark: "{colors.accent.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                },
                success: {
                    subtle: {
                        value: { base: "{colors.success.50}", _dark: "{colors.success.900}" }
                    },
                    muted: {
                        value: { base: "{colors.success.100}", _dark: "{colors.success.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.success.200}", _dark: "{colors.success.700}" }
                    },
                    solid: {
                        value: { base: "{colors.success.500}", _dark: "{colors.success.400}" }
                    },
                    fg: {
                        value: { base: "{colors.success.700}", _dark: "{colors.success.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                },
                warning: {
                    subtle: {
                        value: { base: "{colors.warning.50}", _dark: "{colors.warning.900}" }
                    },
                    muted: {
                        value: { base: "{colors.warning.100}", _dark: "{colors.warning.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.warning.200}", _dark: "{colors.warning.700}" }
                    },
                    solid: {
                        value: { base: "{colors.warning.500}", _dark: "{colors.warning.400}" }
                    },
                    fg: {
                        value: { base: "{colors.warning.700}", _dark: "{colors.warning.200}" }
                    },
                    contrast: {
                        value: "black"
                    }
                },
                danger: {
                    subtle: {
                        value: { base: "{colors.danger.50}", _dark: "{colors.danger.900}" }
                    },
                    muted: {
                        value: { base: "{colors.danger.100}", _dark: "{colors.danger.800}" }
                    },
                    emphasized: {
                        value: { base: "{colors.danger.200}", _dark: "{colors.danger.700}" }
                    },
                    solid: {
                        value: { base: "{colors.danger.500}", _dark: "{colors.danger.400}" }
                    },
                    fg: {
                        value: { base: "{colors.danger.700}", _dark: "{colors.danger.200}" }
                    },
                    contrast: {
                        value: "white"
                    }
                }
            },
        },
    },
})

export const system = createSystem(defaultConfig, customConfig)
