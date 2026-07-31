import { useCompany } from "@/context/CompanyContext";
import { assetUrl } from "@/lib/api";

export const BrandMark = ({ maxHeight = 40, className = "", nameClassName = "", testId = "brand-mark" }) => {
  const { company } = useCompany();
  const logoSrc = assetUrl(company, "logo");
  const fallbackName = company?.name?.trim() || "SD ENTERPRISES";

  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt={fallbackName}
        data-testid={`${testId}-logo`}
        className={className}
        style={{ maxHeight, width: "auto", objectFit: "contain" }}
      />
    );
  }
  return (
    <span data-testid={`${testId}-name`} className={`font-heading font-semibold tracking-tight ${nameClassName}`}>
      {fallbackName}
    </span>
  );
};
