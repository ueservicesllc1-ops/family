// Backblaze B2 Configuration (S3-compatible)
const B2_CONFIG = {
    endpoint: 's3.us-east-005.backblazeb2.com',
    bucketName: 'Familyapp',
    keyId: '005c2b526be0baa0000000028',
    applicationKey: 'K005u+rHbdHmRIlofPRE9L5+Dq5biIw',
    region: 'us-east-005'
};

// Helper function to upload file to B2
async function uploadToB2(file, fileName) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        // For client-side uploads, we'll use a simpler approach
        // In production, you should use a backend service to handle B2 uploads
        const authString = btoa(`${B2_CONFIG.keyId}:${B2_CONFIG.applicationKey}`);

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;

        // B2 S3-compatible upload endpoint
        const uploadUrl = `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${uniqueFileName}`;

        const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': file.type,
                'X-Amz-Acl': 'public-read'
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Return public URL
        return `https://${B2_CONFIG.bucketName}.${B2_CONFIG.endpoint}/${uniqueFileName}`;
    } catch (error) {
        console.error('Error uploading to B2:', error);
        throw error;
    }
}

// Helper function to delete file from B2
async function deleteFromB2(fileUrl) {
    try {
        const fileName = fileUrl.split('/').pop();
        const authString = btoa(`${B2_CONFIG.keyId}:${B2_CONFIG.applicationKey}`);

        const deleteUrl = `https://${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${fileName}`;

        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${authString}`
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting from B2:', error);
        return false;
    }
}

export { uploadToB2, deleteFromB2, B2_CONFIG };
