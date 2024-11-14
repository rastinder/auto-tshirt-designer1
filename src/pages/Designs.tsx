import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@components/Layout/Layout';
import designs from '@data/designs';

interface Design {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  tags: string[];
}

const Designs = () => {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredDesigns = designs.filter((design: Design) => {
    if (selectedCategory && design.category !== selectedCategory) {
      return false;
    }
    if (selectedTags.length > 0 && !selectedTags.every((tag) => design.tags.includes(tag))) {
      return false;
    }
    return true;
  });

  return (
    <Layout title="Designs">
      <h1>Designs</h1>
      <div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Abstract">Abstract</option>
          <option value="Nature">Nature</option>
          {/* Add more category options */}
        </select>
        <select
          value={selectedTags}
          onChange={(e) => setSelectedTags([e.target.value])}
        >
          <option value="">All Tags</option>
          <option value="geometric">Geometric</option>
          <option value="colorful">Colorful</option>
          <option value="floral">Floral</option>
          <option value="organic">Organic</option>
          {/* Add more tag options */}
        </select>
      </div>
      <div className="design-grid">
        {filteredDesigns.map((design: Design) => (
          <div key={design.id} className="design-card" onClick={() => router.push(`/designs/${design.id}`)}>
            <img src={design.imageUrl} alt={design.title} />
            <h3>{design.title}</h3>
            <p>{design.description}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Designs;
