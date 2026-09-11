import ProductDetailPage from "@/views/product-detail-page";

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <ProductDetailPage {...props} />;
}
