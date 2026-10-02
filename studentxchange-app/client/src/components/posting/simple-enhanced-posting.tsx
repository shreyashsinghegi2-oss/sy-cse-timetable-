import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp,
  Shield,
  MapPin,
  CheckCircle,
  Upload,
  FileText,
  Camera,
  X,
  Eye
} from "lucide-react";
import { useEffect } from "react";
import { PRODUCT_CATEGORIES, insertProductSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { EnhancedPricingGuide } from "@/components/ui/enhanced-pricing-guide";

const postingSchema = insertProductSchema.extend({
  institute: z.string().min(1, "Institute name is required"),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  disclaimerAccepted: z.boolean().refine(val => val === true, "You must accept the disclaimer"),
});

type FormData = z.infer<typeof postingSchema>;

interface SimpleEnhancedPostingProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SimpleEnhancedPosting({ onSuccess, onCancel }: SimpleEnhancedPostingProps) {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useInstituteAsAddress, setUseInstituteAsAddress] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ file: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(postingSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      originalPrice: "",
      condition: "",
      category: "",
      quantity: 1,
      institute: "",
      pickupAddress: "",
      disclaimerAccepted: false,
    },
  });

  const createProduct = useMutation({
    mutationFn: async (data: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Create a fresh FormData instance
      const formData = new FormData();
      
      // Add all form fields first
      Object.entries(data).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // CRITICAL FIX: Use selectedFiles state directly - it's the source of truth
      const filesToUpload = selectedFiles.filter(f => f instanceof File && f.size > 0);
      
      if (filesToUpload.length === 0) {
        throw new Error('No files found for upload. Please go back and select files again.');
      }
      
      // Add files to FormData - THIS IS THE CRITICAL SECTION
      filesToUpload.forEach((file, index) => {
        formData.append('files', file, file.name);
      });
      
      // Final verification of FormData contents
      const entries = Array.from(formData.entries());
      const fileEntries = entries.filter(([key, value]) => value instanceof File);
      
      if (fileEntries.length === 0) {
        throw new Error('Critical error: Files were not properly attached to FormData. Please try uploading again.');
      }

      const result = await apiRequest("POST", "/api/products", formData) as any;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "🎉 Product Listed Successfully!",
        description: "Your product is now live and visible to all students!",
        duration: 5000,
      });
      onSuccess?.();
      form.reset();
      setSelectedFiles([]); // Reset files when form resets
      setImagePreviews([]); // Reset previews when form resets
      setStep(1);
    },
    onError: (error: Error) => {
      // Check for authentication error
      if (error.message.includes('Unauthorized') || error.message.includes('Not authenticated') || error.message.includes('AUTH_SILENT_FAIL')) {
        toast({
          title: "Login Required",
          description: "Your session has expired. Please log in again to post a product.",
          variant: "destructive",
          duration: 4000,
        });
        
        // Auto-redirect to login page after showing the error
        setTimeout(() => {
          window.location.href = '/auth';
        }, 2000);
      } else {
        toast({
          title: "Upload Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
    onSettled: () => {
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const onSubmit = (data: FormData) => {
    const hasFilesInState = selectedFiles.length > 0;
    const hasFilesInInput = fileInputRef.current?.files && fileInputRef.current.files.length > 0;
    
    if (!hasFilesInState && !hasFilesInInput) {
      toast({
        title: "No Files Selected",
        description: "Please go back and upload at least one image or document",
        variant: "destructive"
      });
      return;
    }
    
    createProduct.mutate(data);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // This duplicate function is removed - using inline onChange handler instead

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    
    // Remove from selected files
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    
    // Remove preview if it's an image and clean up URL
    if (fileToRemove?.type.startsWith('image/')) {
      setImagePreviews(prev => {
        const previewToRemove = prev.find(p => p.file === fileToRemove);
        if (previewToRemove) {
          URL.revokeObjectURL(previewToRemove.url); // Clean up memory
          return prev.filter(p => p.file !== fileToRemove);
        }
        return prev;
      });
    }
  };

  // Clean up preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [imagePreviews]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      
      {/* Pricing Guide Sidebar - Always Visible */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Step {step} of 6</span>
              <span className="text-sm text-gray-500">
                {step === 1 && "Disclaimer"}
                {step === 2 && "Product Details"}
                {step === 3 && "Smart Pricing"}
                {step === 4 && "Upload Files"}
                {step === 5 && "Address & Pickup"}
                {step === 6 && "Review & Submit"}
              </span>
            </div>
            <Progress value={(step / 6) * 100} className="w-full" />
          </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          {/* Step 1: Disclaimer */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Listing Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Posting Guidelines</h3>
                  <ul className="text-sm space-y-1 text-blue-800">
                    <li>• Provide accurate product information</li>
                    <li>• Set fair prices using our pricing guide</li>
                    <li>• Upload clear images and descriptions</li>
                    <li>• Respond promptly to buyer inquiries</li>
                  </ul>
                </div>
                
                <FormField
                  control={form.control}
                  name="disclaimerAccepted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium">
                          I agree to the posting terms and conditions *
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    className="flex-1"
                    disabled={!form.watch("disclaimerAccepted")}
                  >
                    Accept & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Product Details */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRODUCT_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your product" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Like New">Like New</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="1" onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1">
                    Continue to Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Enhanced Pricing Guide */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Smart Pricing Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  Get personalized pricing recommendations based on your category selection.
                </div>
                
                <EnhancedPricingGuide 
                  selectedCategory={form.watch('category')}
                  currentPrice={form.watch('price')}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Price (₹) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter price" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="originalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Original Price (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Optional" 
                            {...field} 
                            value={field.value || ""} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1">
                    Upload Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Upload Files */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-purple-500" />
                  Upload Images & Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Simple Direct File Input */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <label htmlFor="direct-file-input" className="block">
                      <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer hover:bg-gray-50 ${
                        selectedFiles.length > 0 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}>
                        {selectedFiles.length > 0 ? (
                          <>
                            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                            <h3 className="text-xl font-bold text-green-700 mb-2">
                              ✓ {selectedFiles.length} Files Ready to Upload!
                            </h3>
                            <p className="text-green-600 mb-4">Click here to add more files</p>
                          </>
                        ) : (
                          <>
                            <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-xl font-bold mb-2">Upload Product Images & Documents</h3>
                            <p className="text-gray-500 mb-4">Add photos, PDFs, and documents to showcase your product</p>
                          </>
                        )}
                        
                        <div className="bg-blue-600 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 hover:bg-blue-700 transition-colors">
                          <Upload className="h-5 w-5" />
                          {selectedFiles.length > 0 ? 'Add More Files' : 'Choose Files'}
                        </div>
                        
                        <p className="text-xs text-gray-400 mt-3">
                          Supports: Images (JPG, PNG), PDFs, Documents • Max 50MB per file
                        </p>
                      </div>
                    </label>
                    
                    <input
                      ref={fileInputRef}
                      id="direct-file-input"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const newFiles = Array.from(e.target.files);
                          
                          // Always append files since input has multiple=true
                          setSelectedFiles(prevFiles => {
                            const combinedFiles = [...prevFiles, ...newFiles];
                            
                            // Immediate localStorage backup
                            try {
                              const fileData = combinedFiles.map(f => ({ 
                                name: f.name, 
                                size: f.size, 
                                type: f.type,
                                timestamp: Date.now()
                              }));
                              localStorage.setItem('uploadedFiles', JSON.stringify(fileData));
                            } catch (err) {
                              console.error('LocalStorage backup failed:', err);
                            }
                            
                            return combinedFiles;
                          });
                          
                          // Create image previews for new files only
                          const newPreviews: { file: File; url: string }[] = [];
                          newFiles.forEach(file => {
                            if (file.type.startsWith('image/')) {
                              const url = URL.createObjectURL(file);
                              newPreviews.push({ file, url });
                            }
                          });
                          
                          if (newPreviews.length > 0) {
                            setImagePreviews(prev => [...prev, ...newPreviews]);
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Debug Info - Real-time feedback */}
                  <div className="text-sm bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      <strong className="text-blue-800">Upload Status</strong>
                    </div>
                    <div className="text-blue-700">
                      📁 Files Ready: <strong>{selectedFiles.length}</strong> | 
                      🖼️ Image Previews: <strong>{imagePreviews.length}</strong>
                      {selectedFiles.length > 0 && <span className="ml-2 text-green-600">✓ Files will be uploaded to Firebase</span>}
                    </div>
                  </div>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      Image Previews ({imagePreviews.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {imagePreviews.map((preview, index) => {
                        const fileIndex = selectedFiles.findIndex(f => f === preview.file);
                        return (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                              <img
                                src={preview.url}
                                alt={preview.file.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            {/* Remove button */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeFile(fileIndex)}
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {/* File name overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="truncate">{preview.file.name}</p>
                              <p className="text-gray-300">{(preview.file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Non-Image Files List */}
                {selectedFiles.some(file => !file.type.startsWith('image/')) && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      Other Files ({selectedFiles.filter(f => !f.type.startsWith('image/')).length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedFiles.map((file, index) => {
                        if (file.type.startsWith('image/')) return null;
                        return (
                          <div key={index} className="relative border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(1)} MB • {file.type.split('/')[1]?.toUpperCase() || 'File'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    className="flex-1"
                    disabled={selectedFiles.length === 0}
                  >
                    {selectedFiles.length === 0 ? 'Please Upload Files First' : `Continue with ${selectedFiles.length} files`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Address */}
          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Address & Pickup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="institute"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institute/College Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your institute name"
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            if (useInstituteAsAddress) {
                              form.setValue('pickupAddress', e.target.value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="use-institute"
                    checked={useInstituteAsAddress}
                    onCheckedChange={(checked) => {
                      setUseInstituteAsAddress(checked as boolean);
                      if (checked) {
                        form.setValue('pickupAddress', form.getValues('institute'));
                      } else {
                        form.setValue('pickupAddress', '');
                      }
                    }}
                  />
                  <Label htmlFor="use-institute" className="text-sm">
                    Use institute name as pickup address
                  </Label>
                </div>

                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter pickup address"
                          {...field} 
                          className="min-h-20"
                          disabled={useInstituteAsAddress}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1">
                    Review & Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Review & Submit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Product:</span>
                      <p className="font-medium">{form.watch('title')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <p className="font-medium">{form.watch('category')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Price:</span>
                      <p className="font-medium">₹{form.watch('price')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Condition:</span>
                      <p className="font-medium">{form.watch('condition')}</p>
                    </div>
                  </div>
                  
                  {/* CRITICAL: Show file upload status in review */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">📂 Upload Status</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Files Ready:</span>
                        <span className="font-bold text-blue-700">{selectedFiles.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Image Previews:</span>
                        <span className="font-bold text-blue-700">{imagePreviews.length}</span>
                      </div>
                      {selectedFiles.length > 0 ? (
                        <div className="text-green-700 font-medium">✅ Files will upload to Firebase Storage</div>
                      ) : (
                        <div className="text-red-700 font-medium">❌ No files selected - this will fail!</div>
                      )}
                    </div>
                    
                    {selectedFiles.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-medium text-blue-800">Selected Files:</div>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="text-xs text-blue-700 pl-2">
                            • {file.name} ({(file.size/1024/1024).toFixed(1)}MB)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Publishing product...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep} disabled={isUploading}>
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={isUploading || selectedFiles.length === 0}
                  >
                    {isUploading ? 'Publishing...' : selectedFiles.length === 0 ? 'No Files Selected!' : `Publish with ${selectedFiles.length} files`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
        </div>

        {/* Always Visible Pricing Guide Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <EnhancedPricingGuide 
              selectedCategory={form.watch('category')}
              currentPrice={form.watch('price')}
              className="mb-4"
            />
            
            {/* Upload Progress */}
            {selectedFiles.length > 0 && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4 text-purple-600" />
                    Files Ready ({selectedFiles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedFiles.slice(0, 3).map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {file.type.startsWith('image/') ? (
                        <Camera className="h-3 w-3 text-green-600" />
                      ) : (
                        <FileText className="h-3 w-3 text-blue-600" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </div>
                  ))}
                  {selectedFiles.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{selectedFiles.length - 3} more files
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}