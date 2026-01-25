import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Check } from "lucide-react";

interface ImageCropperProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (croppedBlob: Blob) => void;
    currentImage?: string | null;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

export function ImageCropper({ isOpen, onClose, onSave, currentImage }: ImageCropperProps) {
    const [imgSrc, setImgSrc] = useState<string>("");
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop>();
    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setImgSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        const initialCrop = centerAspectCrop(width, height, 1);
        setCrop(initialCrop);
        // Also set completedCrop so Save works without manual adjustment
        setCompletedCrop(initialCrop);
    }, []);

    const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
        if (!completedCrop || !imgRef.current) return null;

        const image = imgRef.current;
        const canvas = document.createElement("canvas");
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Output size - 256x256 for avatars
        const outputSize = 256;
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            outputSize,
            outputSize
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
        });
    }, [completedCrop]);

    const handleSave = async () => {
        const blob = await getCroppedImg();
        if (blob) {
            onSave(blob);
            handleClose();
        }
    };

    const handleClose = () => {
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Editare imagine de profil</DialogTitle>
                    <DialogDescription>
                        Încărcați o imagine și decupați-o la dimensiunea potrivită
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />

                    {!imgSrc ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                        >
                            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Click pentru a selecta o imagine
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG - max 5MB
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Cropper */}
                            <div className="flex justify-center bg-muted/30 rounded-xl p-4">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                    aspect={1}
                                    circularCrop
                                    className="max-h-[300px]"
                                >
                                    <img
                                        ref={imgRef}
                                        src={imgSrc}
                                        alt="Crop preview"
                                        onLoad={onImageLoad}
                                        className="max-h-[300px]"
                                    />
                                </ReactCrop>
                            </div>

                            {/* Change image button */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                Selectează altă imagine
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        <X className="h-4 w-4 mr-2" />
                        Renunță
                    </Button>
                    <Button onClick={handleSave} disabled={!completedCrop}>
                        <Check className="h-4 w-4 mr-2" />
                        Salvează
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
