/**
 * @returns {import('@forge/api').WebTriggerResponse}
 */
const buildOutput = (body, rnd) => ({
    body: JSON.stringify({ body }),
    headers: {
      'Content-Type': ['application/json'],
      'X-Request-Id': [`rnd-${rnd}`]
    },
    statusCode: 200,
    statusText: 'OK'
  });
  
  const EMAIL = "jeeva.abishake@cprime.com";
  const API_TOKEN = "---"
  const WORKSPACE_ID = "9639f74b-a7d7-4189-9acb-9a493cbfe46f";
  const authHeader = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');
  const BASE_URL = `https://api.atlassian.com/jsm/assets/workspace/${WORKSPACE_ID}/v1`;
  const HEADERS = {
    "Authorization": `Basic ${authHeader}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  };
  
  async function fetchAttributes(objectTypeId) {
    const url = `${BASE_URL}/objecttype/${objectTypeId}/attributes`;
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const attributes = await response.json();
      if (!Array.isArray(attributes)) {
        console.error("Attributes is not an array:", attributes);
        return [];
      }
      return attributes.map(attr => ({ id: attr.id, name: attr.name }));
    } catch (error) {
      console.error("Error fetching attributes:", error.message);
      return [];
    }
  }
  
  /**
   * @param {import('@forge/api').WebTriggerRequest} event
   * @param {import('@forge/api').WebTriggerContext} context
   * @returns {Promise<import('@forge/api').WebTriggerResponse>}
   */
  exports.runAsync = async (event, context) => {
  
  
    const url = `${BASE_URL}/object/aql?startAt=0&maxResults=5&includeAttributes=true`;
    const payload = { qlQuery: "objectType = \"Network Assets\"" };
  
    try {
  
      const response = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const assets = data.values || [];
  
      if (assets.length === 0) {
        return { networkAssets: [] };
      }
  
      const objectTypeId = assets[0]?.objectType?.id;
      const attributes = await fetchAttributes(objectTypeId);
      const attributeMap = Object.fromEntries(attributes.map(attr => [attr.id, attr.name]));
  
      const formattedAssets = {
        networkAssets: assets.map(asset => {
          let attributeData = {};
          asset.attributes.forEach(attr => {
            const name = attributeMap[attr.objectTypeAttributeId];
            if (name && attr.objectAttributeValues?.[0]?.value) {
              attributeData[name] = attr.objectAttributeValues[0].value;
            }
          });
  
          // Get all attribute names and sort them alphabetically
          const sortedAttributeNames = Object.keys(attributeData).sort();
  
          // Create a new object with properties in alphabetical order
          const sortedResult = {};
          sortedAttributeNames.forEach(name => {
            // Skip the fields we want to exclude, but keep 'id'
            if (name !== 'objectKey' && name !== 'Key') {
              sortedResult[name] = attributeData[name];
            }
          });
  
          // Add asset id if not already included in attributes
          if (!sortedResult.id && asset.id) {
            sortedResult.id = asset.id;
          }
  
          return sortedResult;
        })
      };
  
      return buildOutput(formattedAssets, Math.random());
    } catch (error) {
      console.log("Error fetching assets:", error);
      console.error("Error fetching assets:", error);
      return buildOutput(null, Math.random());
    }
  };
  
  const getAllObjects = async (objectSchemaId) => {
    const getAllObjectTypesURL = `${BASE_URL}/objectschema/${objectSchemaId}/objecttypes`
  
    try {
      const response = await fetch(getAllObjectTypesURL, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const objectTypes = await response.json();
      return objectTypes.map(type => ({ id: type.id, name: type.name }));
    } catch (error) {
      console.error("Error fetching object types:", error.message);
      return [];
    }
  }
  
  const createObjectTypeAttributes = async (objectTypeId, name) => {
    const url = `${BASE_URL}/objecttypeattribute/${objectTypeId}/`;
  
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(
          {
            "name": name,
            "type": "0",
            "defaultTypeId": "0"
          }
        )
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("Attribute created");
      return data.id;
    } catch (error) {
      console.error("Error creating object type attributes:", error.message);
      return null;
    }
  }
  
  const getAllAttributesForObjectType = async (objectTypeId) => {
    const url = `${BASE_URL}/objecttype/${objectTypeId}/attributes`;
  
    try {
      const response = await fetch(url, { headers: HEADERS });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const attributes = await response.json();
      if (!Array.isArray(attributes)) {
        console.error("Attributes is not an array:", attributes);
        return [];
      }
      return attributes.map(attr => ({ id: attr.id, name: attr.name }));
    } catch (error) {
      console.error("Error fetching attributes:", error.message);
      return [];
    }
  }
  
  const createAsset = async (objectTypeId, attributes) => {
    const url = `${BASE_URL}/object/create`;
    const payload = {
      "objectTypeId": objectTypeId,
      "attributes": attributes
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText} - ${await response.text()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating asset:", error.message);
      return null;
    }
  }
  
  const createObjectType = async (objectTypeName) => {
    const workspaceId = "9639f74b-a7d7-4189-9acb-9a493cbfe46f"; // Replace with actual workspace ID
    const schemaId = 11;
    const createUrl = `https://api.atlassian.com/jsm/assets/workspace/${workspaceId}/v1/objecttype/create`;
    const payload = {
      inherited: false,
      abstractObjectType: false,
      objectSchemaId: schemaId,
      iconId: "13", // Default icon ID, modify as needed
      name: objectTypeName,
      description: `Auto-created object type: ${objectTypeName}`
    };
  
    try {
      const createResponse = await fetch(createUrl, {
        method: "POST",
        headers: {
          ...HEADERS,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
  
      if (!createResponse.ok) {
        console.error(`Failed to create object type ${objectTypeName}:`, createResponse.status);
        return null;
      } else {
        const data = await createResponse.json();
        console.log(`Successfully created object type: ${objectTypeName}`);
        return data.id;
      }
    } catch (error) {
      console.error("Error creating object type:", error.message);
      return null;
    }
  };
  
  const processRequest = async (request, oldObjectIdToDelete) => {
    // Step 1: Get all object types
    const objectTypes = await getAllObjects(11);
  
    console.log(`Found ${objectTypes.length} object types`);
    console.log(objectTypes);  
  
    // Step 2: Check if the requested object type exists
    let requestedObjectType = objectTypes.find(type =>
      type.name.toLowerCase() === request.objectType.toLowerCase());
  
    if (!requestedObjectType) {
      console.log(`Object type ${request.objectType} not found, creating it.`);
      const newObjectTypeId = await createObjectType(request.objectType);
      if (!newObjectTypeId) {
        console.error(`Failed to create object type: ${request.objectType}`);
        return null;
      }
      requestedObjectType = { id: newObjectTypeId, name: request.objectType };
    }
  
    const objectTypeId = requestedObjectType.id;
    console.log(`Found object type: ${request.objectType} with ID: ${objectTypeId}`);
  
    // Step 3: Get all attributes for this object type
    const existingAttributes = await getAllAttributesForObjectType(objectTypeId);
  
    // Step 4: Process attributes from the request
    const attributesPayload = [];
    for (const [attrName, attrValue] of Object.entries(request.attributes)) {
      // Check if attribute exists
      const existingAttr = existingAttributes.find(attr =>
        attr.name.toLowerCase() === attrName.toLowerCase());
  
      let attrId;
  
      if (existingAttr) {
        attrId = existingAttr.id;
        console.log(`Using existing attribute: ${attrName} with ID: ${attrId}`);
      } else {
        // Create attribute if it doesn't exist
        console.log(`Creating missing attribute: ${attrName}`);
        attrId = await createObjectTypeAttributes(objectTypeId, attrName);
        if (!attrId) {
          console.error(`Failed to create attribute: ${attrName}`);
          continue;
        }
        console.log(`Created new attribute: ${attrName} with ID: ${attrId}`);
      }
  
      // Add to payload
      attributesPayload.push({
        objectTypeAttributeId: attrId,
        objectAttributeValues: [
          { value: attrValue }
        ]
      });
    }
  
    // Step 5: Create the asset with all attributes
    console.log(`Creating asset with ${attributesPayload.length} attributes`);
    const result = await createAsset(objectTypeId, attributesPayload);
  
    // Step 6: Delete old object if specified
    if (oldObjectIdToDelete && result) {
      console.log(`Attempting to delete old object with ID: ${oldObjectIdToDelete}`);
      const deleteResult = await deleteAsset(oldObjectIdToDelete);
      if (deleteResult) {
        console.log(`Successfully deleted old object with ID: ${oldObjectIdToDelete}`);
      } else {
        console.warn(`Failed to delete old object with ID: ${oldObjectIdToDelete}`);
      }
    }
  };
  
  const parseRequest = (inputRequest) => {
    // If the request is already a proper object, return it
    if (typeof inputRequest === 'object' && inputRequest !== null && !Array.isArray(inputRequest)) {
      return inputRequest;
    }
  
    // If the input is a string, try to parse it
    let parsedRequest = {};
  
    try {
      if (typeof inputRequest === 'string') {
        // Try standard JSON parse first
        try {
          parsedRequest = JSON.parse(inputRequest);
          return parsedRequest;
        } catch (e) {
          console.log("Could not parse as standard JSON, trying alternative parsing");
        }
  
        // Handle malformed JSON-like string
        const objectTypeMatch = inputRequest.match(/"objectType":\s*(\w+)/);
        if (objectTypeMatch) {
          parsedRequest.objectType = objectTypeMatch[1];
        }
  
        // Parse attributes section
        const attributesMatch = inputRequest.match(/attributes":\s*{([^}]+)}/);
        if (attributesMatch) {
          const attributesStr = attributesMatch[1];
          const attributePairs = attributesStr.split(',').map(pair => pair.trim());
  
          parsedRequest.attributes = {};
          attributePairs.forEach(pair => {
            const [key, value] = pair.split('=').map(part => part.trim());
            if (key && value !== undefined) {
              parsedRequest.attributes[key] = value;
            }
          });
        }
      }
    } catch (error) {
      console.error("Error parsing request:", error);
    }
    return parsedRequest;
  };
  
  const deleteAsset = async (objectId) => {
    const url = `${BASE_URL}/object/${objectId}`;
  
    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: HEADERS
      });
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText} - ${await response.text()}`);
      console.log(`Successfully deleted asset with ID: ${objectId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting asset with ID ${objectId}:`, error.message);
      return false;
    }
  }
  
  /**
   * @param {import('@forge/api').WebTriggerRequest} request
   * @param {import('@forge/api').WebTriggerContext} context
   * @returns {Promise<import('@forge/api').WebTriggerResponse>}
   */
  exports.createAssets = async (request, context) => {
    try {
      const parsedRequest = JSON.parse(request.body);
  
      const parsedExample = parseRequest(parsedRequest);
  
      const result = await processRequest(parsedExample, parsedExample.attributes.id);
  
      return buildOutput(parsedExample, Math.random());
    } catch (error) {
      console.log("Error processing request:", error);
      return buildOutput(null, Math.random());
    }
  };
  
  
  /**
   * @param {import('@forge/api').WebTriggerRequest} event
   * @param {import('@forge/api').WebTriggerContext} context
   * @returns {import('@forge/api').WebTriggerResponse}
   */
  exports.runSync = (event, context) => {
    const result = buildOutput(Math.random());
    return result;
  };

  exports.KnowledgeBaseWebhook = async (request, context) => {
    const objectSchemaId = 11;

    try {
        // Step 1: Get all object types
        const objectTypes = await getAllObjects(objectSchemaId);

        // Step 2: Fetch assets for each object type
        const allAssets = [];
        for (const objectType of objectTypes) {
            const objectTypeId = objectType.id;
            const attributes = await fetchAttributes(objectTypeId);
            const attributeMap = Object.fromEntries(attributes.map(attr => [attr.id, attr.name]));

            const url = `${BASE_URL}/object/aql?startAt=0&maxResults=5&includeAttributes=true`;
            const payload = { qlQuery: `objectType = "${objectType.name}"` };

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: HEADERS,
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                const assets = data.values || [];

                const formattedAssets = assets.map(asset => {
                    let attributeData = {};
                    asset.attributes.forEach(attr => {
                        const name = attributeMap[attr.objectTypeAttributeId];
                        if (name && attr.objectAttributeValues?.[0]?.value) {
                            attributeData[name] = attr.objectAttributeValues[0].value;
                        }
                    });

                    // Get all attribute names and sort them alphabetically
                    const sortedAttributeNames = Object.keys(attributeData).sort();

                    // Create a new object with properties in alphabetical order
                    const sortedResult = {};
                    sortedAttributeNames.forEach(name => {
                        // Skip the fields we want to exclude
                        if (name !== 'objectKey' && name !== 'Key' && name !== 'id') {
                            sortedResult[name] = attributeData[name];
                        }
                    });

                    return sortedResult;
                });

                allAssets.push(...formattedAssets);
            } catch (error) {
                console.error(`Error fetching assets for object type ${objectType.name}:`, error.message);
            }
        }

        return buildOutput(allAssets, Math.random());
    } catch (error) {
        console.error("Error in KnowledgeBaseWebhook:", error.message);
        return buildOutput(null, Math.random());
    }
};
