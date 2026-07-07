import React, { useRef } from 'react';
import {
    Box,
    Grid,
    Image,
    Icon,
    IconButton,
    Text,
    VStack,
} from '@chakra-ui/react';
import { LuUpload, LuX } from 'react-icons/lu';
import { Button } from '../ui/button';
import { STORAGE_ENABLED } from '../../lib/firebase';

interface ImageUploadProps {
    images: string[];
    onImagesChange: (images: string[]) => void;
    maxImages?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    images,
    onImagesChange,
    maxImages = 5,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages: string[] = [];
        const remainingSlots = maxImages - images.length;
        const filesToProcess = Math.min(files.length, remainingSlots);

        for (let i = 0; i < filesToProcess; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push(reader.result as string);
                if (newImages.length === filesToProcess) {
                    onImagesChange([...images, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        onImagesChange(newImages);
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <VStack align="stretch" gap={3}>
            {/* Upload Button */}
            {images.length < maxImages && (
                <Box>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        disabled={!STORAGE_ENABLED}
                    />
                    <Button
                        variant="outline"
                        onClick={handleUploadClick}
                        w="full"
                        disabled={!STORAGE_ENABLED}
                    >
                        <Icon mr={2}>
                            <LuUpload />
                        </Icon>
                        อัปโหลดรูปภาพ ({images.length}/{maxImages})
                    </Button>
                    {!STORAGE_ENABLED && (
                        <Text color="fg.muted" fontSize="xs" mt={1}>
                            อัปโหลดรูปภาพยังไม่เปิดใช้งาน (รอเปิด Firebase Storage)
                        </Text>
                    )}
                </Box>
            )}

            {/* Image Grid */}
            {images.length > 0 && (
                <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                    {images.map((image, index) => (
                        <Box
                            key={index}
                            position="relative"
                            borderRadius="md"
                            overflow="hidden"
                            borderWidth="1px"
                            borderColor="border.default"
                        >
                            <Image
                                src={image}
                                alt={`Room image ${index + 1}`}
                                w="full"
                                h="100px"
                                objectFit="cover"
                            />
                            <IconButton
                                position="absolute"
                                top={1}
                                right={1}
                                size="sm"
                                colorPalette="red"
                                onClick={() => handleRemoveImage(index)}
                                aria-label="Remove image"
                            >
                                <LuX />
                            </IconButton>
                        </Box>
                    ))}
                </Grid>
            )}

            {images.length === 0 && (
                <Box
                    p={8}
                    borderWidth="2px"
                    borderStyle="dashed"
                    borderColor="border.default"
                    borderRadius="md"
                    textAlign="center"
                >
                    <Icon fontSize="3xl" color="fg.subtle" mb={2}>
                        <LuUpload />
                    </Icon>
                    <Text color="fg.muted" fontSize="sm">
                        ยังไม่มีรูปภาพ
                    </Text>
                </Box>
            )}
        </VStack>
    );
};
