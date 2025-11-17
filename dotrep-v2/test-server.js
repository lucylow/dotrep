import "dotenv/config";
console.log("Testing server startup...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
try {
  const { startServer } = await import("./server/_core/index.ts");
  console.log("Import successful");
} catch (error) {
  console.error("Import error:", error.message);
  console.error(error.stack);
}
