'use server';
/**
 * @fileOverview An AI agent for suggesting document metadata.
 *
 * - suggestDocumentMetadata - A function that handles the document metadata suggestion process.
 * - SuggestDocumentMetadataInput - The input type for the suggestDocumentMetadata function.
 * - SuggestDocumentMetadataOutput - The return type for the suggestDocumentMetadata function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CatalogsSchema = z.object({
  ambitos: z.array(z.object({ id: z.string(), nombre: z.string(), orden: z.number() })).describe('List of accreditation ambitos.'),
  caracteristicas: z.array(z.object({ id: z.string(), ambitoId: z.string(), nombre: z.string(), orden: z.number(), codigo: z.string() })).describe('List of accreditation caracteristicas.'),
  elementosMedibles: z.array(z.object({ id: z.string(), caracteristicaId: z.string(), codigo: z.string(), nombre: z.string(), orden: z.number() })).describe('List of accreditation elementos medibles.'),
  tiposDocumento: z.array(z.object({ id: z.string(), nombre: z.string() })).describe('List of available document types.'),
  servicios: z.array(z.object({ id: z.string(), nombre: z.string() })).describe('List of hospital services.'),
  estadosAcreditacionDoc: z.array(z.object({ id: z.string(), nombre: z.string() })).describe('List of document accreditation states.'),
});

const SuggestDocumentMetadataInputSchema = z.object({
  title: z.string().describe('The title of the document.'),
  description: z.string().optional().describe('A brief description of the document.'),
  catalogs: CatalogsSchema.describe('The hospital-specific catalog data for accreditation classification and document types.'),
});
export type SuggestDocumentMetadataInput = z.infer<typeof SuggestDocumentMetadataInputSchema>;

const SuggestDocumentMetadataOutputSchema = z.object({
  suggestedTipoDocumentoId: z.string().describe('The suggested ID for the document type from the provided catalogs. Must be a valid ID from catalogs.tiposDocumento.'),
  suggestedTags: z.array(z.string()).describe('A list of suggested tags for the document. These should be short, relevant keywords.'),
  suggestedAmbitoId: z.string().describe('The suggested ID for the accreditation ambito from the provided catalogs. Must be a valid ID from catalogs.ambitos.'),
  suggestedCaracteristicaId: z.string().describe('The suggested ID for the accreditation caracteristica from the provided catalogs. Must be a valid ID from catalogs.caracteristicas.'),
  suggestedElementoMedibleId: z.string().describe('The suggested ID for the accreditation elemento medible from the provided catalogs. Must be a valid ID from catalogs.elementosMedibles.'),
});
export type SuggestDocumentMetadataOutput = z.infer<typeof SuggestDocumentMetadataOutputSchema>;

export async function suggestDocumentMetadata(input: SuggestDocumentMetadataInput): Promise<SuggestDocumentMetadataOutput> {
  return suggestDocumentMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDocumentMetadataPrompt',
  input: {schema: SuggestDocumentMetadataInputSchema},
  output: {schema: SuggestDocumentMetadataOutputSchema},
  prompt: `You are an AI assistant specialized in classifying hospital accreditation documents for a Chilean hospital.
Your task is to suggest document metadata based on the provided document title and description, using the given catalog data. The hierarchy is: Ambito -> Caracteristica -> Elemento Medible.

Always select the 'id' field from the catalog entries for your suggestions.
If a suitable match is not found for an accreditation category (ambito, caracteristica, elementoMedible), choose the most general valid ID from the highest applicable level (e.g., if no specific elemento medible matches, try to find a caracteristica, or ambito, and select a default valid ID from that level). Always ensure the selected ID exists in the provided catalog lists.
For 'suggestedTipoDocumentoId', choose the most appropriate ID from the 'tiposDocumento' list.
For 'suggestedTags', generate relevant keywords based on the content. Aim for 3-5 concise tags.

Catalog data:
Ambitos: {{{JSON.stringify catalogs.ambitos}}}
Caracteristicas: {{{JSON.stringify catalogs.caracteristicas}}}
Elementos Medibles: {{{JSON.stringify catalogs.elementosMedibles}}}
Tipos de Documento: {{{JSON.stringify catalogs.tiposDocumento}}}

Document Title: {{{title}}}
Document Description: {{{description}}}

Provide your suggestions in JSON format, strictly adhering to the output schema.`,
});

const suggestDocumentMetadataFlow = ai.defineFlow(
  {
    name: 'suggestDocumentMetadataFlow',
    inputSchema: SuggestDocumentMetadataInputSchema,
    outputSchema: SuggestDocumentMetadataOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

    