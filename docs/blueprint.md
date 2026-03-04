# **App Name**: AcreditaDoc Pro

## Core Features:

- Secure User Authentication & Role-Based Access: Manages user accounts with distinct roles (admin, editor, lector) and enforces hospitalId access via Firebase Auth and Firestore Rules for data and file security.
- Multi-Format Document Uploader: A guided form to upload PDF, DOCX, and XLSX files, capture extensive metadata (classification, context, dates), with client-side validation and progress indication. Files are stored in Firebase Storage and metadata in Firestore.
- AI Metadata Auto-Categorization Tool: Utilizes AI to analyze uploaded document details (title, description) and propose standardized tipoDocumento, tags, and relevant accreditation categories (e.g., ambitoId, caracteristicaId), improving data consistency during the upload process.
- Searchable Document Explorer: An interactive interface allowing users to browse documents with advanced filters (cascading accreditation classification, document type, status, dates) and keyword search functionality for efficient retrieval from Firestore.
- Detailed Document Viewer & Manager: Dedicated page for each document displaying full metadata from Firestore, allowing secure downloading from Firebase Storage, soft-deleting (admins), and metadata editing (editors/admins). Provides an embedded PDF viewer.
- Configurable Catalog & User Management: An admin panel for creating, updating, and ordering hospital-specific classification catalogs (e.g., ambitos, elementosMedibles) and managing user roles and access status, all stored in Firestore.
- Action Audit Trail: Automatically records a comprehensive log of all significant user interactions and document lifecycle events (uploads, updates, deletions, downloads) for complete operational traceability within a dedicated Firestore collection.

## Style Guidelines:

- Primary color: A solid, trustworthy medium-dark blue (#2E5CB3), representing professionalism and clarity, to establish a reliable foundation.
- Background color: A very light, desaturated blue (#EDF1F9) derived from the primary hue, ensuring a clean and airy interface suitable for documentation.
- Accent color: A vivid, engaging cyan-blue (#1781B8), strategically used for calls to action and highlights, providing distinct visual cues and contrast.
- Body and headline font: 'Inter' (sans-serif) for its modern, neutral, and highly readable qualities, ensuring clarity across all content, from document titles to complex data tables.
- Use a clean, outline-based icon set that clearly communicates function without distraction, maintaining a professional and intuitive visual language consistent with medical documentation.
- Employ a structured and responsive grid-based layout for forms and tables, ensuring optimal content display and navigation across various screen sizes, with a focus on hierarchical information presentation.
- Incorporate subtle, functional animations for feedback (e.g., upload progress bars, form field validations, filter transitions) that enhance user experience without causing unnecessary delays or distractions.