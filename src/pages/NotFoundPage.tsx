import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title={t("notFound.title")}
        description={t("notFound.body")}
        action={
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            {t("notFound.cta")}
          </Button>
        }
      />
    </div>
  );
}
