import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/ui/image-upload";
import { UploadCloud, File, Image, X, DollarSign, Info, Calculator } from "lucide-react";
import { InsertProduct, Product, PRODUCT_CATEGORIES, PRODUCT_CONDITIONS } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSimpleToast } from "@/hooks/use-simple-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: "Price must be a positive number" }
  ),
  originalPrice: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: "Original price must be a positive number if provided" }
  ),
  condition: z.enum(PRODUCT_CONDITIONS),
  category: z.enum(PRODUCT_CATEGORIES),
  quantity: z.string().refine(
    (val) => !isNaN(parseInt(val)) && parseInt(val) > 0,
    { message: "Quantity must be a positive number" }
  ),
  images: z.string().array().optional(),
  files: z.string().array().optional(),
  // New optimized image fields
  thumbnailUrls: z.string().array().optional(),
  fullImageUrls: z.string().array().optional(),
  sellerWhatsapp: z.string().min(10, "WhatsApp number must be at least 10 digits"),
  sellerContactName: z.string().min(2, "Name must be at least 2 characters"),
  sellerContactEmail: z.string().email("Please enter a valid email address"),
  pickupAddressType: z.string().min(1, "Address type is required"),
  pickupInstitution: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupCity: z.string().optional(),
  pickupState: z.string().optional(),
  pickupPincode: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Pricing guidance data
const pricingGuide = {
  "Textbooks": { range: "₹100-₹500", suggestion: "50% of MRP for new, 30% for used" },
  "Notes": { range: "₹50-₹200", suggestion: "₹5 per page for handwritten" },
  "Lab Journals": { range: "₹100-₹300", suggestion: "₹5-₹10 per page" },
  "Assignments": { range: "₹30-₹150", suggestion: "₹5 per page" },
  "Stationery": { range: "₹20-₹200", suggestion: "40-60% of MRP" },
  "Calculators": { range: "₹200-₹1000", suggestion: "Based on brand & condition" },
  "Other": { range: "₹50-₹500", suggestion: "Research similar items" }
};

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useSimpleToast();
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<{
    images: string[];
    files: string[];
  }>({
    images: product?.images || [],
    files: product?.files || []
  });
  const [optimizedImages, setOptimizedImages] = useState<Array<{thumbnailUrl: string; fullImageUrl: string}>>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      price: product?.price || "",
      originalPrice: product?.originalPrice || "",
      condition: (product?.condition as any) || "New",
      category: (product?.category as any) || "Textbooks",
      quantity: product?.quantity?.toString() || "1",
      images: product?.images || [],
      files: product?.files || [],
      thumbnailUrls: product?.thumbnailUrls || [],
      fullImageUrls: product?.fullImageUrls || [],
      sellerWhatsapp: product?.sellerWhatsapp || "",
      sellerContactName: product?.sellerContactName || "",
      sellerContactEmail: product?.sellerContactEmail || "",
      pickupAddressType: product?.pickupAddressType || "home",
      pickupInstitution: product?.pickupInstitution || "",
      pickupAddress: product?.pickupAddress || "",
      pickupCity: product?.pickupCity || "",
      pickupState: product?.pickupState || "",
      pickupPincode: product?.pickupPincode || "",
    },
  });

  // Watch category and price for real-time guidance
  const selectedCategory = form.watch("category");
  const enteredPrice = form.watch("price");
  const currentGuidance = pricingGuide[selectedCategory as keyof typeof pricingGuide];
  
  const handleFileUpload = async (files: FileList, type: 'images' | 'files') => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    // Show initial upload notification
    toast({
      title: "Uploading files...",
      description: `Uploading ${files.length} file(s), please wait.`
    });

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await apiRequest("POST", "/api/upload", formData);
      const result = await response.json();
      
      if (!result.success || !result.filenames) {
        throw new Error(result.message || "Failed to upload files");
      }
      
      const newFiles = result.filenames || [];
      
      // Categorize files by type
      const categorizedFiles = {
        images: [] as string[],
        files: [] as string[]
      };
      
      newFiles.forEach((filename: string) => {
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          categorizedFiles.images.push(filename);
        } else {
          categorizedFiles.files.push(filename);
        }
      });
      
      setUploadedFiles(prev => ({
        images: [...prev.images, ...categorizedFiles.images],
        files: [...prev.files, ...categorizedFiles.files]
      }));
      
      // Update form values
      form.setValue('images', [...(form.getValues('images') || []), ...categorizedFiles.images]);
      form.setValue('files', [...(form.getValues('files') || []), ...categorizedFiles.files]);
      
      // Success notification with details
      const imageCount = categorizedFiles.images.length;
      const fileCount = categorizedFiles.files.length;
      let description = "";
      
      if (imageCount > 0 && fileCount > 0) {
        description = `✅ ${imageCount} image(s) and ${fileCount} document(s) uploaded successfully!`;
      } else if (imageCount > 0) {
        description = `✅ ${imageCount} image(s) uploaded successfully!`;
      } else if (fileCount > 0) {
        description = `✅ ${fileCount} document(s) uploaded successfully!`;
      } else {
        description = `✅ ${newFiles.length} file(s) uploaded successfully!`;
      }
      
      toast({
        title: "Upload Complete! 🎉",
        description: description
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      const errorMessage = error.message || "Failed to upload files. Please try again.";
      toast({
        title: "❌ Upload Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (filename: string, type: 'images' | 'files') => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter(f => f !== filename)
    }));
    
    const currentFiles = form.getValues(type) || [];
    form.setValue(type, currentFiles.filter(f => f !== filename));
  };

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      // Convert values to correct types
      const productData: InsertProduct = {
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice || undefined,
        condition: data.condition,
        category: data.category,
        quantity: parseInt(data.quantity),
        images: uploadedFiles.images,
        files: uploadedFiles.files,
        thumbnailUrls: optimizedImages.map(img => img.thumbnailUrl),
        fullImageUrls: optimizedImages.map(img => img.fullImageUrl),
        sellerWhatsapp: data.sellerWhatsapp,
        sellerContactName: data.sellerContactName,
        sellerContactEmail: data.sellerContactEmail,
        pickupAddress: data.pickupAddress,
        pickupCity: data.pickupCity,
        pickupState: data.pickupState,
        pickupPincode: data.pickupPincode,
      };
      
      if (product) {
        // Update existing product
        return await apiRequest("PUT", `/api/products/${product.id}`, productData);
      } else {
        // Create new product
        return await apiRequest("POST", "/api/products", {
          ...productData,
          sellerId: user?.id,
        });
      }
    },
    onSuccess: () => {
      toast({
        title: product ? "Product updated" : "Product created",
        description: product ? "Your product has been updated successfully." : "Your product has been listed successfully.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/seller/${user?.id}`] });
      
      if (!product) {
        form.reset();
        setUploadedFiles({ images: [], files: [] });
      }
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: product ? "Error updating product" : "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: ProductFormValues) {
    createProductMutation.mutate(data);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter product title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your product in detail" 
                  {...field} 
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (INR ₹)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      placeholder="0.00" 
                      className="pl-7"
                      {...field} 
                    />
                  </div>
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
                <FormLabel>Original Price (INR ₹) (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01"
                      placeholder="0.00" 
                      className="pl-7"
                      {...field} 
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pricing Guidance */}
        {currentGuidance && (
          <Alert className="bg-blue-50 border-blue-200">
            <Calculator className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <div className="font-semibold mb-1">Pricing Guidance for {selectedCategory}</div>
              <div className="text-sm">
                <div><strong>Typical Range:</strong> {currentGuidance.range}</div>
                <div><strong>Suggestion:</strong> {currentGuidance.suggestion}</div>
                {enteredPrice && (
                  <div className="mt-2 text-xs">
                    <Badge variant={parseFloat(enteredPrice) < 50 ? "destructive" : parseFloat(enteredPrice) > 1000 ? "secondary" : "default"}>
                      Your Price: ₹{enteredPrice}
                    </Badge>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    step="1"
                    placeholder="1" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="col-span-full">
            <FormItem>
              <FormLabel>Product Images (WebP Optimized)</FormLabel>
              <ImageUpload
                value={optimizedImages}
                onChange={setOptimizedImages}
                maxImages={5}
                disabled={isUploading}
              />
              <FormDescription>
                Images are automatically compressed and converted to WebP format for fast loading. 
                Thumbnails (~100KB) will be shown in listings, full-size images (~300KB) in product details.
              </FormDescription>
              <FormMessage />
            </FormItem>
          </div>
          
          <FormItem>
            <FormLabel>Additional Files (PDFs)</FormLabel>
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-4">
                <div className={`flex flex-col items-center justify-center p-4 border border-dashed rounded-lg transition-colors ${isUploading ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <File className={`h-10 w-10 mb-2 ${isUploading ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
                  <div className="text-sm text-center text-gray-600">
                    <Label htmlFor="pdf-upload" className={`cursor-pointer ${isUploading ? 'text-blue-600' : 'text-primary hover:underline'}`}>
                      {isUploading ? 'Uploading...' : 'Upload PDFs'}
                    </Label>
                    <Input 
                      id="pdf-upload" 
                      type="file" 
                      accept=".pdf" 
                      multiple 
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files, 'files')}
                    />
                    <p className="mt-1 text-xs">PDF files up to 25MB</p>
                  </div>
                </div>
                
                {/* Display uploaded files */}
                {uploadedFiles.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.files.map((filename, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <File className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{filename}</span>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeFile(filename, 'files')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <FormDescription className="text-xs text-center">
                  Upload PDF documents related to your educational material
                </FormDescription>
              </CardContent>
            </Card>
            <FormMessage />
          </FormItem>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-medium mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="sellerContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sellerContactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Your Email" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sellerWhatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="WhatsApp Number" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <h3 className="text-lg font-medium mb-4">Pickup Address</h3>
          <div className="space-y-4">
            {/* Address Type Selection */}
            <FormField
              control={form.control}
              name="pickupAddressType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select address type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="home">Home/Custom Address</SelectItem>
                      <SelectItem value="university">University/College/Institute</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* University/College Selection */}
            {form.watch("pickupAddressType") === "university" && (
              <FormField
                control={form.control}
                name="pickupInstitution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>University/College/Institute Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your university, college or institute name"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-sm text-green-600">
                      ✓ By selecting an educational institution, you can skip detailed address fields
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Custom Address Fields - Only show if not university */}
            {form.watch("pickupAddressType") !== "university" && (
              <>
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complete Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Building/House number, Street name, Area"
                          {...field} 
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pickupCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pickupState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pickupPincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Pincode" 
                            {...field} 
                            maxLength={6}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={createProductMutation.isPending}
          >
            {createProductMutation.isPending 
              ? (product ? "Updating..." : "Creating...") 
              : (product ? "Update Product" : "Create Product")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
