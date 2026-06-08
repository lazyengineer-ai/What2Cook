import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSessionUser } from "@/lib/auth-utils";

const f = createUploadthing();

async function getAuthUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export const ourFileRouter = {
  recipeImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getAuthUser();
      return { householdId: user.householdId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, householdId: metadata.householdId };
    }),

  pantryImage: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getAuthUser();
      return { householdId: user.householdId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, householdId: metadata.householdId };
    }),

  receiptImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await getAuthUser();
      return { householdId: user.householdId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, householdId: metadata.householdId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
