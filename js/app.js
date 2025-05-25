// AWS EC2 Manager Application

// DOM Elements
const credentialsForm = document.getElementById('aws-credentials');
const loadingElement = document.getElementById('loading');
const instancesContainer = document.getElementById('instances-container');
const instancesList = document.getElementById('instances-list');

// Global variables
let awsCredentials = null;
let awsRegions = [];

//! Approximate hourly pricing for common instance types (on-demand Linux, US East)
const instancePricing = {
    "t2.micro": 0.0116,
    "t2.small": 0.023,
    "t2.medium": 0.0464,
    "t3.micro": 0.0104,
    "t3.small": 0.0208,
    "t3.medium": 0.0416,
    "m5.large": 0.096,
    "c5.large": 0.085,
};



// Event listener for form submission
credentialsForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const accountId = document.getElementById('accountId').value.trim();
    const accessKeyId = document.getElementById('accessKeyId').value.trim();
    const secretAccessKey = document.getElementById('secretAccessKey').value.trim();

    // Basic validation
    if (!accountId || !accessKeyId || !secretAccessKey) {
        showError('Please fill in all credential fields');
        return;
    }

    // Store credentials (in memory only)
    awsCredentials = {
        accessKeyId,
        secretAccessKey
    };

    // Show loading indicator
    loadingElement.classList.remove('hidden');

    try {
        // Get all AWS regions
        await fetchAwsRegions();

        // Fetch instances from all regions
        await fetchAllRunningInstances();

        // Hide loading and show instances
        loadingElement.classList.add('hidden');
        instancesContainer.classList.remove('hidden');
    } catch (error) {
        loadingElement.classList.add('hidden');
        showError(`Error connecting to AWS: ${error.message}`);
        console.error('Error:', error);
    }
});

// Fetch all AWS regions
async function fetchAwsRegions() {
    try {
        // Configure AWS SDK with credentials
        AWS.config.update({
            accessKeyId: awsCredentials.accessKeyId,
            secretAccessKey: awsCredentials.secretAccessKey,
            region: 'us-east-1' // Default region to start with
        });

        // Create EC2 service object
        const ec2 = new AWS.EC2();

        // Return a promise for the regions
        return new Promise((resolve, reject) => {
            ec2.describeRegions({}, (err, data) => {
                if (err) {
                    console.error('Error fetching regions:', err);
                    reject(new Error('Failed to fetch AWS regions. Please check your credentials.'));
                    return;
                }

                awsRegions = data.Regions.map(region => region.RegionName);
                console.log('Available regions:', awsRegions);
                resolve(awsRegions);
            });
        });
    } catch (error) {
        console.error('Exception in fetchAwsRegions:', error);
        throw new Error('Failed to initialize AWS SDK. Please check your browser compatibility.');
    }
}

// Fetch running instances from all regions
async function fetchAllRunningInstances() {
    setInterval(() => {
        fetchAllRunningInstances();
    }, 300000);

    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }

    instancesList.innerHTML = '';
    let totalInstancesFound = 0;

    for (const region of awsRegions) {
        try {
            // Update region for this request
            AWS.config.update({ region: region });

            // Create EC2 service object for this region
            const ec2 = new AWS.EC2();

            // Return a promise for the instances
            const instances = await new Promise((resolve, reject) => {
                ec2.describeInstances({
                    Filters: [
                        {
                            Name: 'instance-state-name',
                            Values: ['running']
                        }
                    ]
                }, (err, data) => {
                    if (err) {
                        console.error(`Error fetching instances from ${region}:`, err);
                        reject(err);
                        return;
                    }

                    // Process instances in this region
                    const instances = [];
                    data.Reservations.forEach(reservation => {
                        reservation.Instances.forEach(instance => {
                            instances.push(instance);
                        });
                    });

                    resolve(instances);
                });
            });

            // If instances found in this region, create a region section
            if (instances.length > 0) {
                totalInstancesFound += instances.length;

                const regionSection = document.createElement('div');
                regionSection.className = 'region-section';

                const regionName = document.createElement('div');
                regionName.className = 'region-name';
                regionName.textContent = `Region: ${region}`;
                regionSection.appendChild(regionName);

                // Add each instance to the region section
                instances.forEach(instance => {
                    const instanceCard = createInstanceCard(instance, region);
                    regionSection.appendChild(instanceCard);
                });

                instancesList.appendChild(regionSection);
            }
        } catch (error) {
            console.error(`Error fetching instances from ${region}:`, error);
            // Continue with other regions even if one fails
        }
    }

    // Show message if no instances found
    if (totalInstancesFound === 0) {
        const noInstancesMessage = document.createElement('div');
        noInstancesMessage.className = 'no-instances';
        noInstancesMessage.textContent = 'No running instances found in any region.';
        instancesList.appendChild(noInstancesMessage);
    }
}

// Create an instance card element
function createInstanceCard(instance, region) {
    const card = document.createElement('div');
    card.className = 'instance-card';

    // Instance header with ID and state
    const header = document.createElement('div');
    header.className = 'instance-header';

    const instanceId = document.createElement('div');
    instanceId.className = 'instance-id';
    instanceId.textContent = instance.InstanceId;
    header.appendChild(instanceId);

    const instanceState = document.createElement('div');
    instanceState.className = 'instance-state state-running';
    instanceState.textContent = 'Running';
    header.appendChild(instanceState);

    card.appendChild(header);

    // Instance details
    const details = document.createElement('div');
    details.className = 'instance-details';

    // Find name tag if exists
    let instanceName = 'Unnamed';
    if (instance.Tags) {
        const nameTag = instance.Tags.find(tag => tag.Key === 'Name');
        if (nameTag) {
            instanceName = nameTag.Value;
        }
    }

    //! Add instance information - Enhancement (Added Hourly cost estimate)
    const hourlyCost = instancePricing[instance.InstanceType] || 0;
    const detailsHTML = `
        <div class="instance-detail"><strong>Name:</strong> ${instanceName}</div>
        <div class="instance-detail"><strong>Type:</strong> ${instance.InstanceType}</div>
        <div class="instance-detail"><strong>Public IP:</strong> ${instance.PublicIpAddress || 'None'}</div>
        <div class="instance-detail"><strong>Private IP:</strong> ${instance.PrivateIpAddress || 'None'}</div>
        <div class="instance-detail"><strong>Launch Time:</strong> ${new Date(instance.LaunchTime).toLocaleString()}</div>
        <div class="instance-detail"><strong>Est. Hourly Cost:</strong> $${hourlyCost.toFixed(4)}</div>
    `;

    details.innerHTML = detailsHTML;

    card.appendChild(details);

    // Instance actions
    const actions = document.createElement('div');
    actions.className = 'instance-actions';

    // Start Button
    const startButton = document.createElement('button');
    startButton.className = 'btn-start';
    startButton.textContent = 'Start Instance';
    startButton.addEventListener('click', () => startInstance(instance.InstanceId, region));
    actions.appendChild(startButton);


    // Stop button
    const stopButton = document.createElement('button');
    stopButton.className = 'btn-stop';
    stopButton.textContent = 'Stop Instance';
    stopButton.addEventListener('click', () => stopInstance(instance.InstanceId, region));
    actions.appendChild(stopButton);

    // Terminate button
    const terminateButton = document.createElement('button');
    terminateButton.className = 'btn-terminate';
    terminateButton.textContent = 'Terminate Instance';
    terminateButton.addEventListener('click', () => terminateInstance(instance.InstanceId, region));
    actions.appendChild(terminateButton);

    card.appendChild(actions);

    return card;
}

// Stop an EC2 instance
async function stopInstance(instanceId, region) {
    if (!confirm(`Are you sure you want to stop instance ${instanceId} in ${region}?`)) {
        return;
    }

    try {
        // Update region for this request
        AWS.config.update({ region: region });

        // Create EC2 service object
        const ec2 = new AWS.EC2();

        // Return a promise for the stop operation
        await new Promise((resolve, reject) => {
            ec2.stopInstances({
                InstanceIds: [instanceId]
            }, (err, data) => {
                if (err) {
                    console.error('Error stopping instance:', err);
                    reject(err);
                    return;
                }

                resolve(data);
            });
        });

        alert(`Successfully initiated stop for instance ${instanceId}`);

        // Refresh the instance list
        loadingElement.classList.remove('hidden');
        instancesContainer.classList.add('hidden');
        await fetchAllRunningInstances();
        loadingElement.classList.add('hidden');
        instancesContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error stopping instance:', error);
        alert(`Failed to stop instance: ${error.message}`);
    }
}

// Terminate an EC2 instance
async function terminateInstance(instanceId, region) {
    if (!confirm(`WARNING: Are you absolutely sure you want to TERMINATE instance ${instanceId} in ${region}? This action cannot be undone!`)) {
        return;
    }

    // Double confirmation for termination
    if (!confirm(`FINAL WARNING: Terminating instance ${instanceId} will permanently delete it and all its data. Continue?`)) {
        return;
    }

    try {
        // Update region for this request
        AWS.config.update({ region: region });

        // Create EC2 service object
        const ec2 = new AWS.EC2();

        // Return a promise for the terminate operation
        await new Promise((resolve, reject) => {
            ec2.terminateInstances({
                InstanceIds: [instanceId]
            }, (err, data) => {
                if (err) {
                    console.error('Error terminating instance:', err);
                    reject(err);
                    return;
                }

                resolve(data);
            });
        });

        alert(`Successfully initiated termination for instance ${instanceId}`);

        // Refresh the instance list
        loadingElement.classList.remove('hidden');
        instancesContainer.classList.add('hidden');
        await fetchAllRunningInstances();
        loadingElement.classList.add('hidden');
        instancesContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Error terminating instance:', error);
        alert(`Failed to terminate instance: ${error.message}`);
    }
}

// Show error message
function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    // Insert after the form
    credentialsForm.parentNode.insertBefore(errorElement, credentialsForm.nextSibling);
}


//! Enhancement for the application
async function startInstance(instanceId, region) {
    if (!confirm(`Start instance ${instanceId} in ${region}?`)) return;

    AWS.config.update({ region });
    const ec2 = new AWS.EC2();

    try {
        await new Promise((resolve, reject) => {
            ec2.startInstances({ InstanceIds: [instanceId] }, (err, data) => {
                if (err) return reject(err);
                resolve(data);
            });
        });

        alert(`Successfully started instance ${instanceId}`);
        await refreshInstanceList();
    } catch (error) {
        console.error(error);
        alert(`Error starting instance: ${error.message}`);
    }
}


//! Export Instance Data
document.getElementById('export-json').addEventListener('click', () => {
    const instanceData = [];

    document.querySelectorAll('.region-section').forEach(section => {
        const region = section.querySelector('.region-name')?.textContent.replace('Region: ', '');

        section.querySelectorAll('.instance-card').forEach(card => {
            const instanceId = card.querySelector('.instance-id')?.textContent || '';
            const details = card.querySelectorAll('.instance-detail');

            const name = details[0]?.textContent.replace('Name:', '').trim();
            const type = details[1]?.textContent.replace('Type:', '').trim();
            const publicIp = details[2]?.textContent.replace('Public IP:', '').trim();
            const privateIp = details[3]?.textContent.replace('Private IP:', '').trim();
            const launchTime = details[4]?.textContent.replace('Launch Time:', '').trim();

            instanceData.push({
                instanceId,
                name,
                type,
                publicIp,
                privateIp,
                launchTime,
                region
            });
        });
    });

    // Convert the array to a JSON string
    const jsonString = JSON.stringify(instanceData, null, 2);

    // Create a downloadable blob
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create and trigger the download link
    const link = document.createElement("a");
    link.href = url;
    link.download = "ec2_instances.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

