import JSZip from 'jszip';

interface ContractPackageData {
  contractNumber: string;
  customerName: string;
  contractPdfBlob?: Blob;
  cinImageUrl?: string;
  permisImageUrl?: string;
  passeportImageUrl?: string;
}

/**
 * Download a complete package with contract PDF and identity documents
 */
export const downloadContractPackage = async (data: ContractPackageData) => {
  try {
    const zip = new JSZip();
    const folderName = `Contrat_${data.contractNumber}_${data.customerName}`;
    const folder = zip.folder(folderName);

    if (!folder) {
      throw new Error('Failed to create ZIP folder');
    }

    // Add contract PDF if provided
    if (data.contractPdfBlob) {
      folder.file(`Contrat_${data.contractNumber}.pdf`, data.contractPdfBlob);
    }

    // Helper function to download and add image to ZIP
    const addImageToZip = async (url: string, filename: string) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${filename}`);
        const blob = await response.blob();
        folder.file(filename, blob);
        return true;
      } catch (error) {
        console.error(`Error adding ${filename}:`, error);
        return false;
      }
    };

    // Add identity documents
    const promises: Promise<boolean>[] = [];
    
    if (data.cinImageUrl) {
      promises.push(addImageToZip(data.cinImageUrl, `CIN_${data.customerName}.jpg`));
    }
    
    if (data.permisImageUrl) {
      promises.push(addImageToZip(data.permisImageUrl, `Permis_${data.customerName}.jpg`));
    }
    
    if (data.passeportImageUrl) {
      promises.push(addImageToZip(data.passeportImageUrl, `Passeport_${data.customerName}.jpg`));
    }

    // Wait for all images to be added
    await Promise.all(promises);

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Create download link
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error creating contract package:', error);
    throw error;
  }
};
