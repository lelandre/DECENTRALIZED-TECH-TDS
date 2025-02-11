async function getProducts() {
    try {
        let response = await fetch('/products');
        let products = await response.json();

        let productList = document.getElementById('products-list');
        productList.innerHTML = '';

        products.forEach(product => {
            let li = document.createElement('li');
            li.textContent = `${product.name} - ${product.price}€`;
            productList.appendChild(li);
        });
    } catch (error) {
        console.error("Erreur lors de la récupération des produits :", error);
    }
}
