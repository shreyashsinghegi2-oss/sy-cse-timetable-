import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  Plus,
  Trash2,
  CheckCircle, 
  Shield,
  MapPin,
  Clock,
  FileText,
  Image as ImageIcon,
  X
} from "lucide-react";
import { PRODUCT_CATEGORIES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";
import { EnhancedPricingGuide } from "@/components/ui/enhanced-pricing-guide";
import { FileUpload } from "@/components/product/file-upload";

const bulkProductSchema = z.object({
  disclaimerAccepted: z.boolean().refine(val => val === true, "You must accept the disclaimer"),
  institute: z.string().min(1, "Institute name is required"),
  sharedPickupAddress: z.string().min(1, "Pickup address is required"),
  products: z.array(z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    price: z.string().min(1, "Price is required"),
    originalPrice: z.string().optional(),
    condition: z.string().min(1, "Condition is required"),
    category: z.string().min(1, "Category is required"),
    quantity: z.string().default("1"),
    // Remove images and files from validation since they're handled separately
  })).min(1, "Add at least one product"),
});

type BulkFormData = z.infer<typeof bulkProductSchema>;

interface ComprehensiveBulkUploadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ComprehensiveBulkUpload({ onSuccess, onCancel }: ComprehensiveBulkUploadProps) {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [useInstituteAsAddress, setUseInstituteAsAddress] = useState(false);
  const [fileUploading, setFileUploading] = useState<Record<number, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<number, { images: File[]; files: File[] }>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please log in to use bulk upload</p>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const form = useForm<BulkFormData>({
    resolver: zodResolver(bulkProductSchema),
    defaultValues: {
      disclaimerAccepted: false,
      institute: "",
      sharedPickupAddress: "",
      products: [
        {
          title: "",
          description: "",
          price: "",
          originalPrice: "",
          condition: "",
          category: "",
          quantity: "1",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const createBulkProducts = useMutation({
    mutationFn: async (data: BulkFormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const results = [];
      const totalProducts = data.products.length;
      
      for (let i = 0; i < totalProducts; i++) {
        const product = data.products[i];
        const formData = new FormData();
        
        // Add product data (exclude images and files arrays)
        Object.entries(product).forEach(([key, value]) => {
          if (value && key !== 'images' && key !== 'files' && typeof value === 'string') {
            formData.append(key, value);
          }
        });
        
        // Add shared data
        formData.append('institute', data.institute);
        formData.append('pickupAddress', data.sharedPickupAddress);
        
        // Add actual file objects for this product (like single item system)
        if (uploadedFiles[i]) {
          // Add all files using the same field name as single item system
          uploadedFiles[i].images.forEach(file => {
            formData.append('files', file);
          });
          uploadedFiles[i].files.forEach(file => {
            formData.append('files', file);
          });
        }
        
        try {
          // Use apiRequest with FormData - this handles authentication cookies
          const result = await apiRequest("POST", "/api/products", formData);
          results.push(result);
          setUploadProgress(((i + 1) / totalProducts) * 100);
        } catch (error: any) {
          console.error(`Product ${i + 1} upload error:`, error);
          throw new Error(`Failed to upload product ${i + 1}: ${error.message}`);
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "🎉 Bulk Upload Completed Successfully!",
        description: `All ${results.length} products are now live! Students can discover and purchase your items.`,
        duration: 5000,
      });
      onSuccess?.();
      form.reset();
      setStep(1);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BulkFormData) => {
    createBulkProducts.mutate(data);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // File upload handler for each product
  const handleFileUpload = async (files: File[], productIndex: number) => {
    if (!files || files.length === 0) return;

    setFileUploading(prev => ({ ...prev, [productIndex]: true }));
    
    toast({
      title: "Processing files...",
      description: `Processing ${files.length} file(s) for Product ${productIndex + 1}.`
    });

    try {
      // Don't upload to server yet, just process files locally
      
      const updatedFiles = { ...uploadedFiles };
      if (!updatedFiles[productIndex]) {
        updatedFiles[productIndex] = { images: [], files: [] };
      }

      // Store File objects instead of filenames
      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          updatedFiles[productIndex].images.push(file);
        } else {
          updatedFiles[productIndex].files.push(file);
        }
      });

      setUploadedFiles(updatedFiles);

      const imageCount = updatedFiles[productIndex].images.length;
      const fileCount = updatedFiles[productIndex].files.length;
      let description = "";
      
      if (imageCount > 0 && fileCount > 0) {
        description = `✅ ${imageCount} image(s) and ${fileCount} document(s) ready for Product ${productIndex + 1}!`;
      } else if (imageCount > 0) {
        description = `✅ ${imageCount} image(s) ready for Product ${productIndex + 1}!`;
      } else if (fileCount > 0) {
        description = `✅ ${fileCount} document(s) ready for Product ${productIndex + 1}!`;
      } else {
        description = `✅ ${files.length} file(s) ready for Product ${productIndex + 1}!`;
      }
      
      toast({
        title: "Files Ready! 🎉",
        description: description
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      const errorMessage = error.message || "Failed to upload files. Please try again.";
      toast({
        title: "❌ File Processing Failed",
        description: `Product ${productIndex + 1}: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setFileUploading(prev => ({ ...prev, [productIndex]: false }));
    }
  };

  const removeFile = (productIndex: number, file: File, type: 'images' | 'files') => {
    const updatedFiles = { ...uploadedFiles };
    if (updatedFiles[productIndex]) {
      updatedFiles[productIndex][type] = updatedFiles[productIndex][type].filter(f => f !== file);
      setUploadedFiles(updatedFiles);
      
      toast({
        title: "File Removed",
        description: `${file.name} removed from Product ${productIndex + 1}`,
        variant: "default"
      });
    }
  };

  const addProduct = () => {
    append({
      title: "",
      description: "",
      price: "",
      originalPrice: "",
      condition: "",
      category: "",
      quantity: "1",
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {step} of 4</span>
          <span className="text-sm text-gray-500">
            {step === 1 && "Disclaimer"}
            {step === 2 && "Products & Files"}
            {step === 3 && "Address & Pickup"}
            {step === 4 && "Review & Upload"}
          </span>
        </div>
        <Progress value={(step / 4) * 100} className="w-full" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          
          {/* Step 1: Disclaimer */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Bulk Upload Disclaimer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Bulk Upload Guidelines</h3>
                  <ul className="text-sm space-y-1 text-blue-800">
                    <li>• Upload multiple products with shared pickup address</li>
                    <li>• Ensure all product information is accurate</li>
                    <li>• Each product must have unique title and description</li>
                    <li>• Set competitive prices for all items</li>
                    <li>• One shared address will be used for all pickups</li>
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
                          I agree to bulk upload terms and conditions *
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          All products will share the same pickup address and institute information.
                        </p>
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

          {/* Step 2: Products with Smart Pricing */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold">Add Products ({fields.length})</span>
                      <p className="text-sm font-normal text-gray-600">Each product gets personalized pricing guidance</p>
                    </div>
                    <Button type="button" onClick={addProduct} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Product
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Product {index + 1}</CardTitle>
                      {fields.length > 1 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (fields.length > 1) {
                              remove(index);
                              // Clean up uploaded files for this product
                              const updatedFiles = { ...uploadedFiles };
                              delete updatedFiles[index];
                              setUploadedFiles(updatedFiles);
                              
                              toast({
                                title: "Product Removed",
                                description: `Product ${index + 1} and its files have been removed`,
                                variant: "default"
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* Pricing Guide for each product */}
                    {form.watch(`products.${index}.category`) && (
                      <EnhancedPricingGuide 
                        selectedCategory={form.watch(`products.${index}.category`)}
                        currentPrice={form.watch(`products.${index}.price`)}
                        className="mb-4"
                      />
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`products.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="Product title" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.category`}
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
                      name={`products.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Product description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`products.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₹) *</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Price" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.originalPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Original Price (₹)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Optional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`products.${index}.condition`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condition *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Condition" />
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
                        name={`products.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} min="1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Upload Files for Product {index + 1}</h4>
                        {fileUploading[index] && (
                          <span className="text-sm text-blue-600 animate-pulse">Uploading...</span>
                        )}
                      </div>
                      
                      <FileUpload 
                        onFilesChange={(files) => handleFileUpload(files, index)}
                        maxFiles={5}
                        maxSize={25}
                      />

                      {/* Display uploaded files */}
                      {uploadedFiles[index] && (uploadedFiles[index].images.length > 0 || uploadedFiles[index].files.length > 0) && (
                        <div className="bg-green-50 p-4 rounded-lg space-y-2">
                          <h5 className="font-medium text-green-800 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Uploaded Files ({uploadedFiles[index].images.length + uploadedFiles[index].files.length})
                          </h5>
                          
                          {/* Images */}
                          {uploadedFiles[index].images.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" /> Images ({uploadedFiles[index].images.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {uploadedFiles[index].images.map((file, fileIndex) => (
                                  <div key={fileIndex} className="bg-white px-2 py-1 rounded border text-xs flex items-center gap-1">
                                    <ImageIcon className="h-3 w-3 text-blue-500" />
                                    <span className="truncate max-w-20">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeFile(index, file, 'images')}
                                      className="text-red-500 hover:text-red-700 ml-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Documents/Files */}
                          {uploadedFiles[index].files.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-green-700 flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Documents ({uploadedFiles[index].files.length})
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {uploadedFiles[index].files.map((file, fileIndex) => (
                                  <div key={fileIndex} className="bg-white px-2 py-1 rounded border text-xs flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-green-500" />
                                    <span className="truncate max-w-20">{file.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeFile(index, file, 'files')}
                                      className="text-red-500 hover:text-red-700 ml-1"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={prevStep}>
                  Back
                </Button>
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="flex-1"
                  disabled={Object.values(fileUploading).some(uploading => uploading)}
                >
                  {Object.values(fileUploading).some(uploading => uploading) ? "Uploading Files..." : "Continue to Address"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Address & Pickup */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Shared Address & Pickup
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
                              form.setValue('sharedPickupAddress', e.target.value);
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
                    id="use-institute-bulk"
                    checked={useInstituteAsAddress}
                    onCheckedChange={(checked) => {
                      setUseInstituteAsAddress(checked as boolean);
                      if (checked) {
                        form.setValue('sharedPickupAddress', form.getValues('institute'));
                      } else {
                        form.setValue('sharedPickupAddress', '');
                      }
                    }}
                  />
                  <Label htmlFor="use-institute-bulk" className="text-sm">
                    Use institute name as pickup address
                  </Label>
                </div>

                <FormField
                  control={form.control}
                  name="sharedPickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shared Pickup Address *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter pickup address for all products"
                          {...field} 
                          className="min-h-20"
                          disabled={useInstituteAsAddress}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Bulk Pickup Information</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    All {fields.length} products will be picked up from this single address. Our team will contact you to coordinate the collection.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="flex-1">
                    Review & Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Review Bulk Upload
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div>
                    <h3 className="font-medium text-lg">Upload Summary</h3>
                    <p className="text-sm text-gray-600">{fields.length} products ready for upload</p>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div><strong>Institute:</strong> {form.watch("institute")}</div>
                    <div><strong>Pickup Address:</strong> {form.watch("sharedPickupAddress")}</div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Products:</h4>
                    {form.watch("products").map((product, index) => {
                      const productFiles = uploadedFiles[index];
                      const totalFiles = productFiles ? (productFiles.images.length + productFiles.files.length) : 0;
                      
                      return (
                        <div key={index} className="text-sm bg-white p-3 rounded border space-y-1">
                          <div className="flex items-center justify-between">
                            <strong>{product.title}</strong>
                            <span className="text-green-600 font-medium">₹{product.price}</span>
                          </div>
                          <div className="text-gray-600">
                            Condition: {product.condition} | Category: {product.category} | Qty: {product.quantity}
                          </div>
                          {totalFiles > 0 && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <Upload className="h-3 w-3" />
                              <span className="text-xs">
                                {productFiles?.images.length || 0} image(s), {productFiles?.files.length || 0} document(s) uploaded
                              </span>
                            </div>
                          )}
                          {totalFiles === 0 && (
                            <div className="text-amber-600 text-xs flex items-center gap-1">
                              <Upload className="h-3 w-3" />
                              No files uploaded for this product
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading products...</span>
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
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading..." : `Upload ${fields.length} Products`}
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
              selectedCategory={fields.length > 0 ? form.watch(`products.0.category`) : undefined}
              currentPrice={fields.length > 0 ? form.watch(`products.0.price`) : undefined}
              className="mb-4"
            />
            
            {/* Bulk Upload Status */}
            {fields.length > 1 && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    Bulk Upload ({fields.length} Products)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-green-700">
                    Use the pricing guide to set competitive prices for all your products.
                  </div>
                  {fields.slice(0, 3).map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="truncate">
                        Product {index + 1}: {form.watch(`products.${index}.category`) || 'Not set'}
                      </span>
                    </div>
                  ))}
                  {fields.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{fields.length - 3} more products
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