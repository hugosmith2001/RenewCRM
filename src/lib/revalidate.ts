import { revalidateTag } from "next/cache";
import {
  customerActivitiesTag,
  customerContactsTag,
  customerDocumentsTag,
  customerInsuredObjectsTag,
  customerPoliciesTag,
  customerTasksTag,
} from "@/lib/cache-tags";

export function revalidateCustomerDetailCaches(tenantId: string, customerId: string) {
  revalidateTag(customerContactsTag(tenantId, customerId));
  revalidateTag(customerInsuredObjectsTag(tenantId, customerId));
  revalidateTag(customerPoliciesTag(tenantId, customerId));
  revalidateTag(customerDocumentsTag(tenantId, customerId));
  revalidateTag(customerActivitiesTag(tenantId, customerId));
  revalidateTag(customerTasksTag(tenantId, customerId));
}

