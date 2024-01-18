# Flexible data relay
Flexible Data Relay (FDR) can be used to share data between multiple systems (or __tenants__). Each tenant can create or update entities, as they do a GraphQL schema will be dynamicaly generated. This schema will allow other tenants that have been granted access to query it. An allowed tenant can also subscribe to the creation / update of an entity.

## Endpoints
### /token
To get a token that will be used in the Bearer header to identify the requests, you need to run this POST request. __Every endpoint under /app will need this token, sent in the Bearer headers__.

Example :
``````
curl --request POST \
  --url http://localhost:3000/token \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/2023.5.8' \
  --data '{
	"clientId": "65a93af6da99a62e7d9478da",
	"clientSecret": "1f917aa9aef4ad85b78fd09134b99ce0701b2a82e0412b76e9cd3da83574c83b58308c368def4d509d5f4e2eaec080446d25176d0785ab2e8f34ec85f4f9ac6e"
}'
``````

Response : 
````
{
	"Bearer": "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjY1YTkzYWY2ZGE5OWE2MmU3ZDk0NzhkYSIsImV4cCI6MTcwODE4MTg1OX0.mK_z2dThTLeD90RHD3PsVCm9855g2-BlypRWEN6o8oZOhITrvdlWtggoXB82MuvOhfmR2X_mg2L4tZRg1QlURQ"
}
``````

### /app/allow-access
This request grants access to your resources to another tenant.
Example :
````
curl --request POST \
  --url http://localhost:3000/app/allow-access \
  --header 'Bearer: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjY1YTg0OTlmNmZjZmMwZjczNmJiY2I2ZCIsImV4cCI6MTcwODEyMDIwOX0.qistxYHRx9QhoXerw7b_EPaeDOSarvZvqsLpV6eT6QbG8auQ6z9XRaPE3cI3HNXVOjd8vESA3YKE3zC64rBdYQ' \
  --header 'Content-Type: application/json' \
  --data '{
	"tenantName": "Hugo2"
}'
````

### /app/:tenant/entity/:entity
Example :
````
curl --request POST \
  --url http://localhost:3000/app/Hugo/entity/asset \
  --header 'Bearer: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjY1YTkzYWY2ZGE5OWE2MmU3ZDk0NzhkYSIsImV4cCI6MTcwODE4MTg1OX0.mK_z2dThTLeD90RHD3PsVCm9855g2-BlypRWEN6o8oZOhITrvdlWtggoXB82MuvOhfmR2X_mg2L4tZRg1QlURQ' \
  --header 'Content-Type: application/json' \
  --data '{
	"id": "entity3",
	"myString": "String",
	"myNumber": 24,
	"myNumber2": 42.5
}'
````
Response :
```
{
	"id": "entity3",
	"myString": "String",
	"myNumber": 24,
	"myNumber2": 42.5
}
```

### /app/:tenant/graphql
This is the graphql endpoint from which you can query tenant entity.

`````
curl --request POST \
  --url 'http://localhost:3000/app/Hugo/graphql?=' \
  --header 'Bearer: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjY1YTkzYWY2ZGE5OWE2MmU3ZDk0NzhkYSIsImV4cCI6MTcwODE4MTg1OX0.mK_z2dThTLeD90RHD3PsVCm9855g2-BlypRWEN6o8oZOhITrvdlWtggoXB82MuvOhfmR2X_mg2L4tZRg1QlURQ' \
  --header 'Content-Type: application/json' \
  --header 'User-Agent: insomnia/2023.5.8' \
  --data '{"query":"query {\n\tasset(id: \"entity3\") {\n\t\tid\n\t\tmyString\n\t\tmyNumber\n\t\tmyNumber2\n\t}\n}\n"}'
`````

### /app/:tenant/subscribe
Example :
```
curl --request POST \
  --url http://localhost:3000/app/Hugo/subscribe \
  --header 'Bearer: eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0ZW5hbnRJZCI6IjY1YTkzYWY2ZGE5OWE2MmU3ZDk0NzhkYSIsImV4cCI6MTcwODE4MTg1OX0.mK_z2dThTLeD90RHD3PsVCm9855g2-BlypRWEN6o8oZOhITrvdlWtggoXB82MuvOhfmR2X_mg2L4tZRg1QlURQ' \
  --header 'Content-Type: application/json' \
  --data '{
	"entity": "asset",
    "queueUrl: "amqp://localhost",
}'
```
The message that will be sent to the provided queue looks like this on entity creation:
```
{
  "entity": {...yourEntity},
  "action": "created"
}
```
or like this on entity update :
```
{
  "entity": {...yourEntity},
  "action": "update"
}
```