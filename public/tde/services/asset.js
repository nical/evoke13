angular.module("tde.services.asset", [])

.service("Asset", function($rootScope, $http, $routeParams, Notifications)
{
	this.assets = []
	this.currentProjectId = ""
	
	var self = this
	this.refreshAssetList = function()
	{
		if ($routeParams.projectId)
		{
			$http.get("/data/project/" + $routeParams.projectId + "/assets").success(function(data) {
				self.assets = data;
				$rootScope.$broadcast("assetListChanged")
			})
		}
	}
	
	this.createAsset = function(type, callback)
	{
		var name = type + Date.now()
		var asset = {name: name, type: type}
		
		$http.post("/data/project/" + $routeParams.projectId + "/assets", asset).
			success(function()
			{
				if (callback)
					callback(null, asset)
			}).
			error(function(error)
			{
				if (callback)
					callback(error, asset)
			})
	}
	
	this.renameAsset = function(asset, newName, callback)
	{
		$http.post("/data/project/" + $routeParams.projectId + "/asset/" + asset.name + "." + asset.type, {rename: newName}).
			success(function()
			{
				if (callback)
					callback(null)
			}).
			error(function(error)
			{
				if (callback)
					callback(error)
			})
	}
	
	$rootScope.$on('$routeChangeSuccess', function()
	{
		if (self.currentProjectId != $routeParams.projectId)
		{
			self.assets = []
			self.currentProjectId = $routeParams.projectId
			$rootScope.$broadcast("assetListChanged")
			self.refreshAssetList()
		}
	})
	
	Notifications.on("assetListChanged", function(data)
	{
		if ($routeParams.projectId == data.projectId)
			self.refreshAssetList()
	})
})
